
1. Overview: From Static to Adaptive AI
1.1 Core Philosophy

The current AI is statistically optimal but exploitable by humans who learn its patterns. To become unbeatable, the AI must:

    Learn each opponent's playstyle through history

    Adapt thresholds dynamically based on opponent behavior

    Maintain unpredictability through intentional mixed strategies

    Record all games (AI vs AI, AI vs Human) for pattern recognition

1.2 Success Metrics
Metric	Target	Current
Win rate vs human	>65%	~30-40%
Doubt accuracy	>75%	~50%
Bluff success rate	>55%	~0% (never bluffs)
Human exploitability	Low	High
2. Opponent Profiling System
2.1 Data Collection Per Opponent
python

class OpponentProfile:
    def __init__(self, player_id):
        self.player_id = player_id
        self.is_human = True  # or False for AI opponents
        
        # Core statistics
        self.total_games_played = 0
        self.total_rounds_played = 0
        self.total_bids_made = 0
        self.total_doubts_made = 0
        self.total_spot_ons_made = 0
        
        # Accuracy metrics
        self.bids_that_were_true = 0  # bid count ≤ actual dice
        self.bids_that_were_false = 0  # bid count > actual dice
        self.doubt_accuracy = 0  # percentage of doubts that were correct
        self.spot_on_accuracy = 0  # percentage of spot-ons that were correct
        
        # Behavioral patterns
        self.bid_distribution = {}  # {count: frequency}
        self.face_preferences = {}  # {face: frequency}
        self.aggression_score = 0  # 0-100 (how often they raise aggressively)
        self.risk_tolerance = 0  # 0-100 (how risky their bids are)
        self.bluff_frequency = 0  # estimated bluff rate
        
        # Temporal patterns
        self.recent_success_rate = []  # last 10 rounds
        self.stage_performance = {  # performance by stage
            '4_player': {'wins': 0, 'losses': 0},
            '3_player': {'wins': 0, 'losses': 0},
            '2_player': {'wins': 0, 'losses': 0}
        }
        
        # Last 100 bids with context
        self.bid_history = []  # (bid, hand_strength, outcome, was_bluff)
        
        # Learning state
        self.confidence_in_profile = 0.5  # starts uncertain
        self.last_updated = timestamp()

2.2 Key Derivable Metrics

Aggression Score:
python

def calculate_aggression(profile):
    """
    0 = always safe bids
    100 = always aggressive bids
    """
    # Bid count relative to expected value
    avg_bid_count = sum(profile.bid_distribution.keys()) / len(profile.bid_distribution)
    expected_bid_count = profile.total_dice_observed / 4  # rough estimate
    
    aggression = (avg_bid_count / expected_bid_count) * 50
    
    # How often they raise by more than +1
    big_raises = [b for b in profile.bid_history if b.raise_amount > 1]
    aggression += (len(big_raises) / len(profile.bid_history)) * 50
    
    return min(100, aggression)

Risk Tolerance:
python

def calculate_risk_tolerance(profile):
    """
    Risk tolerance = willingness to bid into low probability territory
    """
    risky_bids = 0
    for bid in profile.bid_history:
        achievability = probability_of_bid(bid.count, bid.face, bid.total_dice)
        if achievability < 0.4:  # <40% chance of being true
            risky_bids += 1
    
    return (risky_bids / len(profile.bid_history)) * 100

Bluff Frequency Estimate:
python

def estimate_bluff_frequency(profile):
    """
    Estimates how often opponent is bluffing based on:
    1. Their hand strength when bidding (if observable in AI games)
    2. How often their bids fail (indirect proxy)
    """
    # For human games: use bid failure rate as proxy
    bid_failure_rate = profile.bids_that_were_false / max(1, profile.total_bids_made)
    
    # Adjust for conservatism
    if profile.aggression_score < 30:
        # Conservative players bluff less
        return bid_failure_rate * 0.6
    elif profile.aggression_score > 70:
        # Aggressive players bluff more
        return bid_failure_rate * 1.4
    else:
        return bid_failure_rate

3. Dynamic Threshold Adaptation
3.1 Per-Opponent Doubt Threshold

Base Doubt Threshold: 20% (from original design)

Adaptation Formula:
python

def adjusted_doubt_threshold(profile, current_opponent=None):
    base_threshold = 0.20
    
    # 1. Opponent reliability adjustment
    if profile:
        # If opponent is highly accurate, raise threshold (trust them more)
        accuracy = profile.bids_that_were_true / max(1, profile.total_bids_made)
        threshold_adjustment = (accuracy - 0.5) * 0.3  # Range: -0.15 to +0.15
        
        # If opponent is a bluffer, lower threshold (trust them less)
        bluff_rate = estimate_bluff_frequency(profile)
        bluff_adjustment = -bluff_rate * 0.2
        
        # 2. Historical success vs this opponent
        if current_opponent:
            win_rate_vs_opponent = get_win_rate_vs(profile.player_id)
            if win_rate_vs_opponent > 0.6:
                # We're winning - be more conservative
                threshold_adjustment += 0.05
            elif win_rate_vs_opponent < 0.4:
                # We're losing - be more aggressive
                threshold_adjustment -= 0.05
    
    adjusted = base_threshold + threshold_adjustment + bluff_adjustment
    
    # Clamp to reasonable range
    return max(0.05, min(0.45, adjusted))

3.2 Per-Opponent Bluff Frequency

Base Bluff Rate: 0% (was 0 in original)

Target Bluff Rate:
python

def target_bluff_rate(profile, stage):
    # Base rate depends on game stage
    base_rates = {
        '4_player': 0.25,  # Bluff 25% of the time with 4 players
        '3_player': 0.20,  # Less bluffing with fewer players
        '2_player': 0.10   # Very little bluffing in endgame
    }
    base = base_rates[stage]
    
    # Adjust based on opponent's vulnerability
    if profile:
        # How often does this opponent doubt?
        doubt_frequency = profile.total_doubts_made / max(1, profile.total_rounds_played)
        
        if doubt_frequency < 0.15:
            # Opponent rarely doubts → we can bluff more
            base *= 1.5
        elif doubt_frequency > 0.40:
            # Opponent doubts a lot → bluff less
            base *= 0.6
        
        # How good is opponent at detecting bluffs?
        if profile.doubt_accuracy > 0.6:
            # Opponent is good at catching bluffs → bluff less
            base *= 0.7
    
    return min(0.5, base)

3.3 Per-Opponent Spot On Threshold
python

def adjusted_spot_on_threshold(profile):
    base_threshold = 0.70
    
    if profile:
        # If opponent doubts a lot, we can spot on more confidently
        doubt_frequency = profile.total_doubts_made / max(1, profile.total_rounds_played)
        if doubt_frequency > 0.35:
            base_threshold -= 0.10
        
        # If opponent has poor spot-on accuracy, they're unlikely to do it
        if profile.spot_on_accuracy < 0.3:
            base_threshold -= 0.10
    
    # Endgame adjustment
    if current_stage == '2_player':
        base_threshold = 0.55  # Lower in endgame
        
    return max(0.40, min(0.80, base_threshold))

4. Mixed Strategy Implementation
4.1 Bid Indifference Mechanism

Goal: Make opponents indifferent to doubting the AI's bids.
python

class MixedStrategyAI:
    def __init__(self):
        self.bluff_history = []
        self.truth_history = []
    
    def decide_bid(self, game_state, opponent_profile=None):
        """
        Implements a mixed strategy where:
        - Truthful bids and bluffs are indistinguishable
        - Probability of bluff is calibrated to opponent's skill
        """
        
        # 1. Calculate the "optimal" truthful bid
        truthful_bid = self.calculate_optimal_bid(game_state)
        truth_achievability = truthful_bid.achievability
        
        # 2. Generate plausible bluffs
        bluff_options = self.generate_bluff_candidates(game_state)
        
        # 3. Determine bluff probability for this situation
        bluff_probability = self.calculate_bluff_probability(
            truth_achievability, 
            game_state, 
            opponent_profile
        )
        
        # 4. Make decision
        if random() < bluff_probability:
            # Bluff: pick a plausible bluff
            selected_bid = self.select_bluff(bluff_options, game_state)
            self.bluff_history.append({
                'bid': selected_bid,
                'situation': game_state.get_context()
            })
            return selected_bid
        else:
            # Truthful: pick the optimal bid
            self.truth_history.append({
                'bid': truthful_bid,
                'situation': game_state.get_context()
            })
            return truthful_bid
    
    def calculate_bluff_probability(self, truth_achievability, game_state, profile):
        """
        Bluff probability is calibrated to make the bid appear realistic.
        
        If truth_achievability is high, bluffing is dangerous (low probability)
        If truth_achievability is moderate, bluffing is reasonable (moderate probability)
        """
        
        # Base probability from opponent profile
        base_bluff_rate = target_bluff_rate(profile, game_state.stage)
        
        # Adjust for achievability
        if truth_achievability > 0.75:
            # High achievability = should probably be truthful
            return base_bluff_rate * 0.3
        elif 0.4 < truth_achievability < 0.75:
            # Moderate achievability = ambiguous - good for bluffing
            return base_bluff_rate
        else:  # truth_achievability < 0.4
            # Low achievability = already risky, bluffing might be too obvious
            return base_bluff_rate * 0.5
        
    def generate_bluff_candidates(self, game_state):
        """
        Generate plausible-looking bluff bids
        """
        candidates = []
        
        # Option 1: Same face, lower count (looks conservative)
        # Option 2: Different face, same count (looks like a face change)
        # Option 3: Face with better distribution (statistically plausible)
        # Option 4: Aggressive jump (+2 or more) (looks confident)
        
        return candidates

4.2 Pattern Breaking
python

class PatternBreaker:
    def __init__(self):
        self.last_actions = []
        self.pattern_detected = False
        
    def detect_patterns(self, action_history):
        """
        Detect if the AI has become predictable
        """
        # Check if last 5 actions are all similar
        recent = action_history[-5:]
        if len(recent) >= 5:
            unique_actions = len(set(recent))
            if unique_actions <= 2:  # Too predictable
                return True
        return False
    
    def break_pattern(self, intended_action, game_state):
        """
        Intentionally choose a different action to break patterns
        """
        if self.detect_patterns(self.last_actions):
            # Force a different action
            alternatives = ['DOUBT', 'RAISE', 'SPOT_ON']
            alternatives.remove(intended_action)
            return random.choice(alternatives)
        return intended_action

5. Machine Learning Integration
5.1 Simple Online Learning Model
python

class SimpleMLModel:
    def __init__(self):
        self.weights = {
            'aggression': 0.1,
            'bluff_rate': 0.15,
            'doubt_frequency': 0.1,
            'face_preference': 0.05,
            'stage_performance': 0.1,
            'win_rate_vs_opponent': 0.1,
            'recent_form': 0.2,  # Most important: recent behavior
            'variance': 0.2      # How unpredictable they are
        }
        
        self.training_data = []
        self.prediction_accuracy = []
        
    def predict_opponent_action(self, opponent_profile, game_state):
        """
        Predict what the opponent will do in this situation
        """
        features = self.extract_features(opponent_profile, game_state)
        
        # Simple linear model
        score = sum(features[i] * self.weights[f] for i, f in enumerate(self.weights))
        
        # Map to action probabilities
        actions = ['DOUBT', 'RAISE', 'SPOT_ON']
        probabilities = self.softmax([score, score*0.8, score*0.2])
        
        return dict(zip(actions, probabilities))
    
    def train(self, actual_action, features):
        """
        Update weights based on prediction errors
        """
        predicted = self.predict_from_features(features)
        error = actual_action - predicted
        self.update_weights(error)
        
        self.training_data.append((features, actual_action))
        self.prediction_accuracy.append(1 - abs(error))

5.2 Opponent Clustering
python

class OpponentClusterer:
    def __init__(self):
        self.clusters = {
            'aggressive_bluffer': {'count': 0, 'characteristics': []},
            'conservative_honest': {'count': 0, 'characteristics': []},
            'unpredictable_mixed': {'count': 0, 'characteristics': []},
            'novice_random': {'count': 0, 'characteristics': []},
            'adaptive_pro': {'count': 0, 'characteristics': []}
        }
    
    def classify_opponent(self, profile):
        """
        Classify opponent into a category for strategy selection
        """
        features = {
            'aggression': profile.aggression_score,
            'bluff_rate': estimate_bluff_frequency(profile),
            'doubt_frequency': profile.total_doubts_made / max(1, profile.total_rounds_played),
            'bid_variance': self.calculate_bid_variance(profile),
            'accuracy': profile.bids_that_were_true / max(1, profile.total_bids_made)
        }
        
        # Simple classification based on thresholds
        if features['aggression'] > 65 and features['bluff_rate'] > 0.3:
            return 'aggressive_bluffer'
        elif features['aggression'] < 35 and features['bluff_rate'] < 0.15:
            return 'conservative_honest'
        elif features['bid_variance'] > 0.5:
            return 'unpredictable_mixed'
        elif features['accuracy'] > 0.6 and features['aggression'] > 50:
            return 'adaptive_pro'
        else:
            return 'novice_random'
    
    def get_counter_strategy(self, classification):
        """
        Return optimal strategy against each cluster
        """
        strategies = {
            'aggressive_bluffer': {
                'doubt_threshold': 0.30,  # More likely to doubt (they bluff)
                'bluff_frequency': 0.35,   # Match their aggression
                'spot_on_threshold': 0.55  # Lower to catch their bluffs
            },
            'conservative_honest': {
                'doubt_threshold': 0.40,   # Trust them more
                'bluff_frequency': 0.45,   # Bluff more against cautious players
                'spot_on_threshold': 0.70  # Higher (they're reliable)
            },
            'unpredictable_mixed': {
                'doubt_threshold': 0.25,   # Stay flexible
                'bluff_frequency': 0.30,   # Conservative against unpredictable
                'spot_on_threshold': 0.65  # Balanced
            },
            'novice_random': {
                'doubt_threshold': 0.20,   # Aggressively doubt (they make mistakes)
                'bluff_frequency': 0.20,   # Don't over-bluff against novices
                'spot_on_threshold': 0.60  # Take calculated risks
            },
            'adaptive_pro': {
                'doubt_threshold': 0.35,   # Careful against good players
                'bluff_frequency': 0.25,   # Less bluffing (they'll catch you)
                'spot_on_threshold': 0.75  # Very careful
            }
        }
        return strategies[classification]

5.3 Reinforcement Learning for Strategy Selection
python

class StrategySelector:
    def __init__(self):
        self.strategy_options = [
            'doubt_focused',      # Always look for doubt opportunities
            'raise_focused',      # Always try to raise
            'balanced',           # Mixed strategy
            'exploitative',       # Try to exploit opponent weaknesses
            'defensive',          # Conservative, avoid risks
            'aggressive_bluff'    # Heavy bluffing strategy
        ]
        
        # Q-learning state
        self.q_table = {}  # (opponent_cluster, game_stage, recent_outcome) -> strategy weights
        self.exploration_rate = 0.3
        
    def select_strategy(self, opponent_profile, game_state):
        """
        Choose the best strategy for this situation
        """
        # 1. Get state key
        state = self.get_state(opponent_profile, game_state)
        
        # 2. Get Q-values for this state
        q_values = self.q_table.get(state, {s: 0 for s in self.strategy_options})
        
        # 3. Explore or exploit
        if random() < self.exploration_rate:
            # Try something random
            strategy = random.choice(self.strategy_options)
        else:
            # Choose best strategy
            strategy = max(q_values, key=q_values.get)
        
        return strategy
    
    def update_strategy_effectiveness(self, strategy, outcome):
        """
        Update Q-values based on how well the strategy performed
        """
        # Outcome: +1 for win, -1 for loss, 0 for neutral
        reward = outcome  # -1 to +1
        
        # Update Q-value for this (state, strategy) pair
        learning_rate = 0.1
        discount_factor = 0.9
        
        current_q = self.q_table[self.current_state][strategy]
        future_q = max(self.q_table.get(self.next_state, {}).values())  # Best future value
        
        new_q = current_q + learning_rate * (reward + discount_factor * future_q - current_q)
        self.q_table[self.current_state][strategy] = new_q

6. Historical Database Design
6.1 Game Recording Schema
sql

-- Opponent profile table
CREATE TABLE opponents (
    id INTEGER PRIMARY KEY,
    name TEXT,
    is_human BOOLEAN,
    total_games INTEGER DEFAULT 0,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    cluster TEXT
);

-- Game records
CREATE TABLE games (
    id INTEGER PRIMARY KEY,
    date TIMESTAMP,
    players TEXT,  -- JSON array of player IDs
    winner INTEGER REFERENCES opponents(id),
    total_rounds INTEGER,
    ai_vs_human BOOLEAN,
    ai_won BOOLEAN
);

-- Round records
CREATE TABLE rounds (
    id INTEGER PRIMARY KEY,
    game_id INTEGER REFERENCES games(id),
    round_number INTEGER,
    stage TEXT,  -- '4_player', '3_player', '2_player'
    num_dice INTEGER,
    winner INTEGER REFERENCES opponents(id),
    eliminated INTEGER REFERENCES opponents(id),
    final_bid_count INTEGER,
    final_bid_face INTEGER,
    actual_count INTEGER
);

-- Bid records
CREATE TABLE bids (
    id INTEGER PRIMARY KEY,
    round_id INTEGER REFERENCES rounds(id),
    bidder INTEGER REFERENCES opponents(id),
    position INTEGER,  -- order in round
    count INTEGER,
    face INTEGER,
    was_bluff BOOLEAN,  -- true if bid > actual dice
    was_challenged BOOLEAN,
    challenge_outcome TEXT  -- 'success', 'failed', 'spot_on'
);

-- Player statistics view
CREATE VIEW player_statistics AS
SELECT 
    o.id,
    o.name,
    COUNT(DISTINCT g.id) as games_played,
    SUM(CASE WHEN g.winner = o.id THEN 1 ELSE 0 END) as games_won,
    AVG(CASE WHEN g.winner = o.id THEN 1 ELSE 0 END) as win_rate,
    COUNT(b.id) as total_bids,
    AVG(b.was_bluff) as bluff_rate,
    AVG(CASE WHEN b.was_challenged AND b.challenge_outcome = 'failed' 
        THEN 1 ELSE 0 END) as doubt_resistance
FROM opponents o
LEFT JOIN games g ON o.id IN (g.players)
LEFT JOIN rounds r ON g.id = r.game_id
LEFT JOIN bids b ON r.id = b.round_id AND b.bidder = o.id
GROUP BY o.id;

6.2 Pattern Recognition Functions
python

class PatternRecognizer:
    def __init__(self, db_connection):
        self.db = db_connection
        self.pattern_cache = {}
    
    def get_opponent_patterns(self, opponent_id, context_window=50):
        """
        Extract recurrent patterns from opponent's play history
        """
        query = """
        SELECT 
            COUNT(DISTINCT DATE(date)) as days_played,
            AVG(CASE WHEN was_bluff THEN 1 ELSE 0 END) as bluff_frequency,
            AVG(CASE WHEN was_challenged AND challenge_outcome = 'success' THEN 1 ELSE 0 END) as successful_doubt_rate,
            MODE(count) as most_common_bid,
            MODE(face) as most_common_face,
            COUNT(CASE WHEN raise_amount > 2 THEN 1 END) / COUNT(*) as aggression_index,
            STDDEV(count) as bid_variance
        FROM bids b
        JOIN rounds r ON b.round_id = r.id
        JOIN games g ON r.game_id = g.id
        WHERE b.bidder = %s
        AND g.date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY r.round_number DESC
        LIMIT %s
        """
        return self.db.execute(query, [opponent_id, context_window])
    
    def detect_tendencies(self, opponent_id):
        """
        Detect specific tendencies in opponent's play
        """
        patterns = {}
        
        # 1. Face preference
        patterns['favored_faces'] = self.get_favored_faces(opponent_id)
        
        # 2. Position dependency (do they play differently based on turn?)
        patterns['position_behavior'] = self.get_position_dependent_behavior(opponent_id)
        
        # 3. Stage dependency (do they change in endgame?)
        patterns['stage_behavior'] = self.get_stage_dependent_behavior(opponent_id)
        
        # 4. Pressure response (how do they react when challenged?)
        patterns['pressure_response'] = self.get_pressure_response(opponent_id)
        
        # 5. Bluff patterns (do they bluff in predictable situations?)
        patterns['bluff_triggers'] = self.get_bluff_triggers(opponent_id)
        
        return patterns

7. Implementation: Adaptive AI Pipeline
7.1 Complete Decision Flow
python

class AdaptiveLiarDiceAI:
    def __init__(self, db_connection=None):
        self.db = db_connection or SQLiteDatabase(':memory:')
        self.profiler = OpponentProfiler(self.db)
        self.ml_model = SimpleMLModel()
        self.clusterer = OpponentClusterer()
        self.strategy_selector = StrategySelector()
        self.pattern_breaker = PatternBreaker()
        
        self.current_opponents = {}
        self.action_history = []
    
    def decide_action(self, game_state):
        """
        Main decision entry point
        """
        # 1. Get opponent profiles
        opponent_profiles = self.get_opponent_profiles(game_state.current_opponent)
        
        # 2. Classify opponents
        classifications = {
            opp: self.clusterer.classify_opponent(profile)
            for opp, profile in opponent_profiles.items()
        }
        
        # 3. Select strategy based on classification
        primary_opponent = game_state.current_opponent
        strategy = self.strategy_selector.select_strategy(
            opponent_profiles[primary_opponent],
            game_state
        )
        
        # 4. Apply strategy to get base decision
        base_decision = self.apply_strategy(
            strategy, 
            game_state, 
            opponent_profiles[primary_opponent]
        )
        
        # 5. Break patterns if needed
        final_decision = self.pattern_breaker.break_pattern(
            base_decision,
            game_state
        )
        
        # 6. Record for learning
        self.record_action(final_decision, game_state)
        
        return final_decision
    
    def apply_strategy(self, strategy, game_state, opponent_profile):
        """
        Apply the selected strategy to make a decision
        """
        # Get base statistical decision
        statistical_decision = self.get_statistical_decision(game_state)
        
        # Apply strategy-specific modifications
        if strategy == 'doubt_focused':
            return self.apply_doubt_focused(statistical_decision, game_state, opponent_profile)
        
        elif strategy == 'raise_focused':
            return self.apply_raise_focused(statistical_decision, game_state, opponent_profile)
        
        elif strategy == 'balanced':
            return self.apply_balanced(statistical_decision, game_state, opponent_profile)
        
        elif strategy == 'exploitative':
            return self.apply_exploitative(statistical_decision, game_state, opponent_profile)
        
        elif strategy == 'defensive':
            return self.apply_defensive(statistical_decision, game_state, opponent_profile)
        
        elif strategy == 'aggressive_bluff':
            return self.apply_aggressive_bluff(statistical_decision, game_state, opponent_profile)
        
        else:
            return statistical_decision
    
    def record_action(self, action, game_state):
        """
        Record action for learning and pattern detection
        """
        self.action_history.append({
            'action': action,
            'game_state': game_state.serialize(),
            'timestamp': time.time()
        })
        
        # Keep only last 1000 actions
        if len(self.action_history) > 1000:
            self.action_history = self.action_history[-1000:]
        
        # Update opponent profile with this action (if outcome known later)
        self.pending_updates.append({
            'action': action,
            'opponent': game_state.current_opponent,
            'game_state': game_state.serialize()
        })

7.2 Strategy-Specific Implementation
python

# Strategy implementations

def apply_doubt_focused(self, base_decision, game_state, profile):
    """
    Aggressively doubt opponent bids
    """
    if base_decision == 'RAISE':
        # Consider doubting instead
        if random() < 0.6:  # 60% chance to doubt instead of raising
            return 'DOUBT'
    return base_decision

def apply_raise_focused(self, base_decision, game_state, profile):
    """
    Prefer raising over doubting
    """
    if base_decision == 'DOUBT':
        # Consider raising instead
        if random() < 0.4:  # 40% chance to raise instead
            return self.generate_raise_bid(game_state)
    return base_decision

def apply_balanced(self, base_decision, game_state, profile):
    """
    Maintain balanced strategy - let statistical model decide
    """
    return base_decision

def apply_exploitative(self, base_decision, game_state, profile):
    """
    Exploit known opponent weaknesses
    """
    patterns = self.pattern_recognizer.get_opponent_patterns(profile.player_id)
    
    # If opponent never doubts, bluff more
    if patterns['doubt_frequency'] < 0.15:
        if base_decision == 'RAISE':
            # Make a more aggressive bid
            return self.generate_aggressive_raise(game_state)
    
    # If opponent always doubts, be more honest
    if patterns['doubt_frequency'] > 0.4:
        if base_decision == 'DOUBT':
            return self.generate_safe_raise(game_state)
    
    return base_decision

def apply_defensive(self, base_decision, game_state, profile):
    """
    Conservative play - avoid risks
    """
    # Only doubt when very confident
    if base_decision == 'DOUBT':
        achievability = self.calculate_bid_achievability(game_state.current_bid)
        if achievability > 0.25:  # Only doubt if <25% chance
            return self.generate_safe_raise(game_state)
    
    # Never spot on unless extremely confident
    if base_decision == 'SPOT_ON':
        return 'DOUBT'
    
    return base_decision

def apply_aggressive_bluff(self, base_decision, game_state, profile):
    """
    Heavy bluffing strategy
    """
    if base_decision == 'RAISE':
        # Make more aggressive raises
        aggressive_bid = self.generate_aggressive_raise(game_state)
        return aggressive_bid
    
    if base_decision == 'DOUBT' and random() < 0.3:
        # Sometimes raise instead of doubt
        return self.generate_raise_bid(game_state)
    
    return base_decision

8. Training and Evaluation
8.1 Offline Training Protocol
python

class AI_Trainer:
    def __init__(self, ai_instance, opponent_pool, num_games=1000):
        self.ai = ai_instance
        self.opponents = opponent_pool
        self.num_games = num_games
        
        self.results = {
            'wins': 0,
            'losses': 0,
            'accuracy': [],
            'bluff_success': [],
            'doubt_accuracy': []
        }
    
    def train_episode(self):
        """
        Run one full training game
        """
        game = Game(self.opponents, ai_player=self.ai)
        winner = game.play()
        
        # Record results
        if winner == self.ai.player_id:
            self.results['wins'] += 1
        else:
            self.results['losses'] += 1
        
        # Update AI based on game outcome
        self.ai.learn_from_game(game)
        
        # Log metrics
        self.results['accuracy'].append(self.ai.get_decision_accuracy(game))
        self.results['bluff_success'].append(self.ai.get_bluff_success_rate(game))
        self.results['doubt_accuracy'].append(self.ai.get_doubt_accuracy(game))
    
    def train(self):
        """
        Main training loop
        """
        for episode in range(self.num_games):
            self.train_episode()
            
            # Periodic evaluation
            if episode % 100 == 0:
                self.evaluate()
        
        # Final evaluation
        self.final_evaluate()

8.2 Performance Metrics
python

class PerformanceMonitor:
    def __init__(self):
        self.metrics = {
            'win_rate': [],
            'bluff_success_rate': [],
            'doubt_accuracy': [],
            'exploitability_score': [],
            'human_win_rate': [],
            'recent_performance': deque(maxlen=10)
        }
    
    def calculate_exploitability(self, ai_instance, opponent):
        """
        How exploitable is the AI against a human?
        Lower score = less exploitable (better)
        """
        # Simulate 100 games where opponent tries to exploit
        exploit_games = self.simulate_exploit_games(ai_instance, opponent)
        
        # Calculate how much the opponent wins vs baseline
        baseline_win_rate = 0.5  # Random baseline
        actual_win_rate = exploit_games.win_rate
        
        exploitability = actual_win_rate - baseline_win_rate
        return max(0, min(1, exploitability))
    
    def track_pattern_detection(self, ai_instance):
        """
        How quickly can opponents detect AI's patterns?
        """
        # Run progressive games and measure learning speed
        pattern_scores = []
        for i in range(10, 101, 10):
            # Train opponent for i games
            opponent = self.train_opponent(i)
            # Test how well they predict AI
            prediction_accuracy = opponent.predict_ai_action(ai_instance)
            pattern_scores.append(prediction_accuracy)
        
        # If prediction accuracy goes above 60% quickly, AI is too predictable
        return pattern_scores

9. Specific Opponent Archetypes and Counter-Strategies
9.1 Human Archetypes
Archetype	Characteristics	Counter-Strategy
Conservative Honest	Only bids what they have, rarely bluffs	Bluff more often, doubt less, exploit their predictability
Aggressive Bluffer	Bids high often, bluffs frequently	Doubt more often, be more honest, they'll overcommit
Unpredictable Mixed	Varies playstyle, hard to read	Stick to balanced strategy, don't over-adjust
Novice Random	No clear pattern, random decisions	Play statistically optimal, they'll make mistakes
Adaptive Pro	Learns and adjusts to AI's patterns	Constantly change strategy, stay unpredictable
9.2 Strategy Selection Matrix
text

Opponent Archetype | Doubt Threshold | Bluff Rate | Spot On Threshold | Strategy Style
-------------------|-----------------|------------|-------------------|----------------
Conservative Honest| 0.40            | 0.45       | 0.70              | Aggressive Bluff
Aggressive Bluffer | 0.25            | 0.35       | 0.55              | Doubt Focused
Unpredictable Mixed| 0.30            | 0.30       | 0.65              | Balanced
Novice Random      | 0.20            | 0.20       | 0.60              | Exploitative
Adaptive Pro       | 0.35            | 0.25       | 0.75              | Defensive

10. Implementation Checklist

    □

    Opponent profile database schema
    □

    Profile tracking for all opponents (human and AI)
    □

    Dynamic threshold adaptation per opponent
    □

    Mixed strategy with calibrated bluff probability
    □

    Pattern breaking mechanism
    □

    Strategy selection system
    □

    Machine learning model for opponent prediction
    □

    Opponent clustering and classification
    □

    Q-learning for strategy effectiveness
    □

    Historical game recording
    □

    Pattern recognition functions
    □

    Training pipeline
    □

    Performance monitoring system
    □

    Exploitability testing
    □

    Human playtesting
    □

    Online learning during games

11. Expected Outcomes
11.1 Before vs After
Metric	Before (Static)	After (Adaptive)
AI Win Rate vs Human	~30-40%	~65-75%
Human Exploitability	High	Low
