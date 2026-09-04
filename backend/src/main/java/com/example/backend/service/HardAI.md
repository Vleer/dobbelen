# Optimal Liar's Dice AI Design Document

## 1. Game Overview

**Variant**: Progressive Elimination
- Start with 4 players → 3 players → 2 players → Winner
- Losing a round eliminates a player (until 1 remains per stage)
- Win stage → reset to 4 players
- First player to win all stages wins the game

**Three Actions**:
1. **Raise**: Bid N dice showing face F (must be more aggressive than last bid)
2. **Doubt**: Challenge the previous bid (dice revealed)
3. **Spot On**: Claim the bid is exactly correct

---

## 2. Core Probability Framework

### 2.1 Bid Achievability

**Binomial Probability Model**

For N dice in play, probability of achieving exactly K dice showing face F:
```
P(K | N) = C(N,K) × (1/6)^K × (5/6)^(N-K)
```

For "at least K" (the typical bid):
```
P(≥K | N) = Σ P(i | N) for i = K to N
```

**Example Calculations** (4 players = 16 dice):
- "Four 3's": P(≥4 showing 3s) = ~99.8% (very safe)
- "Eight 3's": P(≥8 showing 3s) = ~51.6% (coin flip)
- "Twelve 3's": P(≥12 showing 3s) = ~0.3% (suicide bid)

### 2.2 Bid Progression Safety

When a player raises with "N2 dice showing F2" after "N1 dice showing F1":

**Most aggressive valid bid** (always valid):
- Same face, N2 = N1 + 1 (e.g., "four 3's" → "five 3's")

**Alternative valid bid** (lower count, higher face):
- Different face F2, N2 ≤ N1 + 1 depending on face ordering
- Typical rule: N2 = N1 for same face value, N2 = N1-1 for higher face

**Safety margin** = Achievability of new bid - Achievability of previous bid
- Positive margin = bid is relatively safer than what's been bid
- Negative margin = bid is riskier/more aggressive

### 2.3 Information State Tracking

**Visible Information**:
- Your own N_you dice (100% known)
- Other players' dice counts N_opp (known exactly)
- Complete bid history (who bid what, in what order)

**Uncertainty**:
- Distribution of each opponent's dice values
- Whether previous bidder actually has their bid (they might be bluffing)

**Bayesian State**:
- Prior: Each opponent's dice are random
- Update: Based on bids made (aggressive bids suggest certain faces present, conservative bids suggest absence)
- Posterior: Probability distribution over opponent hands

---

## 3. Decision Framework: When to Use Each Action

### 3.1 DOUBT Strategy (Challenge the Bid)

**Core Question**: Is the previous bid too risky to be true?

**Doubt EV Calculation**:
```
EV(Doubt) = P(bid fails) × Value(win round) 
          - P(bid succeeds) × Value(lose round)
```

**Bid Failure Threshold**:
- Doubt if: P(bid achievable) < T_doubt
- T_doubt ≈ 40-50% (varies by player count and position)

**Why not always doubt obvious bluffs?**
- If P(≥12 threes | 16 dice) = 0.3%, why not doubt 100%?
- Answer: The bidder might actually have it (unlikely but possible)
- Or: You're third in sequence—the previous challenger might have already doubted
- Or: Player count is low (2-3 left), so defensive values matter

**Sophisticated Doubt Logic**:

1. **Bid Implausibility Score**:
   ```
   Implausibility = 1 - P(bid achievable | all remaining dice)
   ```
   - If Implausibility > 60%: Strong doubt candidate
   - If Implausibility > 80%: Very likely to doubt (unless position-specific)
   - If Implausibility > 95%: Almost always doubt

2. **Player History Adjustment**:
   - Track each player's bid accuracy
   - Aggressive player = lower doubt threshold (they bluff more)
   - Conservative player = higher doubt threshold (bid is likely true)
   - Formula: `T_doubt *= (player_bid_success_rate)`

3. **Position and Count Adjustment**:
   - With 4 players: More forgiving doubt threshold (you can afford to lose)
   - With 2 players: Much lower doubt threshold (one loss = elimination)
   - Formula: `T_doubt *= (players_remaining / 4)`

**Decision Rule**:
```
IF P(bid) < T_doubt * adjustment_factor:
    DOUBT
ELSE IF can_raise_safely:
    RAISE
ELSE:
    SPOT_ON or fold
```

### 3.2 RAISE Strategy (Bid Aggressively)

**Core Principle**: Raise when you have evidence supporting a bid.

**Raise Confidence Levels**:

**Tier 1 - Very Safe** (Raise always):
- P(bid) > 90%
- Example: You have 4 dice showing 3s, bid "four 3's total" with 16 dice
- Strategy: Build pot, appear conservative

**Tier 2 - Safe** (Raise if ahead in info):
- P(bid) > 75%
- You have solid evidence for the face
- Example: You have 3 sixes, bid "five 6's total"

**Tier 3 - Medium** (Raise only with bluff justification):
- P(bid) = 40-75%
- Requires strategic reasoning (see Section 3.4)
- Example: You have 0 of the face, but bid "three" based on statistical likelihood

**Tier 4 - Risky** (Rarely raise):
- P(bid) < 40%
- Only if: (a) you're desperate, or (b) heavy bluff situation
- Most AIs should avoid this

**Raise Selection Algorithm**:

```
candidates = [all valid bids]

FOR each candidate:
    achievability = P(candidate bid | all dice)
    
    IF achievability > 90%:
        score = +100 (very safe)
    ELIF achievability > 75%:
        score = +50 (safe)
    ELIF achievability > 60%:
        score = +25 (moderate)
    ELIF achievability > 40%:
        score = bluff_score(candidate)
    ELSE:
        score = -1000 (skip)
    
    IF score > threshold:
        candidates_to_consider.add(candidate)

CHOOSE candidate with highest score
```

**Next Bid Selection** (most safe raises):
- **Default**: Same face, +1 count (e.g., "four 3's" → "five 3's")
- **Alternative**: Same count or +1, switch to face with better distribution
- **Rare**: Drop count, switch face (signal: very confident in new face)

### 3.3 SPOT ON Strategy (Exact Call)

**Core Principle**: Highest risk, highest reward. Eliminates all other players in round.

**When to Spot On**:

**Condition 1 - Very High Confidence**:
- You know (roughly) what dice show
- P(exact bid is right) > 70%
- Almost always "you should have doubted instead" situations

**Condition 2 - Desperate Situation**:
- You're about to be eliminated anyway
- Next bid will almost certainly be wrong for you
- P(exact | your dice analysis) > 55%
- EV of Spot On > EV of Doubt

**Condition 3 - Bidder Trap**:
- Bidder is trapped in a number
- They've been forced higher and higher
- You're highly confident they overshot
- Example: They bid "twelve 3's" after a long sequence
- P(bid | remaining dice) < 20% AND P(bid is exact) > 30%

**Spot On Decision Rule**:
```
confidence_in_exact = your_analysis_of_all_dice

IF confidence_in_exact > 70%:
    SPOT_ON (almost certainly right, high confidence)
    
ELIF confidence_in_exact > 55% AND you_are_losing:
    SPOT_ON (nothing to lose, gamble for big elimination)
    
ELIF you_are_winning AND confidence > 65%:
    SPOT_ON (safe position + high confidence = good risk)
    
ELSE:
    DON'T SPOT_ON (too risky)
```

**Why Spot On is Rarely Optimal**:
- Doubt gives you: Win if bid fails
- Spot On gives you: Win if bid is EXACTLY right (much stricter)
- Unless bid is already very unlikely (in which case doubt wins anyway)
- Exception: Endgame (2-3 players) where risk-reward flips
- Exception: You can deduce the exact number from bidding pattern

---

## 4. Bluffing Strategy: When to Bid Aggressively

### 4.1 Expected Value of Bluffing

**Bluff EV**:
```
EV(bluff at prob P) = P(succeeds) × Value(advance) 
                    + (1-P) × Value(challenged and fail)
```

**When Bluffing Becomes +EV**:

At 4 players (you're 1 of 4):
- If you win round: 4 → 3 players (you're now 1 of 3, better position)
- Value(advance) = "promotion" value ≈ +0.5 points
- Value(fail) = elimination = -1.0 points (or worse if you're losing)

**Bluff Threshold**:
```
EV(bluff) > EV(safe_raise)
P × 0.5 + (1-P) × (-1.0) > P × 0.3 + (1-P) × (-0.1)
P × 0.5 - 1 + P > P × 0.3 - 0.1 + P × 0.1
P × 0.2 > 0.9
P > 45%
```

**Conclusion**: Bluff when P(bid succeeds if doubted) > ~45-50%

### 4.2 Bluff Situations (Tiers)

**Tier 1 - Justified Bluff** (P > 50%):
- You have 2 dice showing 6s
- Bid "four 6's" (P ≈ 85%)
- This is rational aggression, not really a bluff
- Always do this

**Tier 2 - Statistical Bluff** (P = 40-50%):
- You have 0-1 dice showing a face
- Bid it anyway because it's statistically likely among N total dice
- Example: 16 dice, you have 0 sixes, but statistically ~2.67 should show
- P(≥3 sixes | 16 dice, you have 0) ≈ 48%
- **When**: After conservative bids, to probe
- **When**: Late in bidding sequence when bidder is trapped
- **When**: Player count is high (more dice = more likely to exist)

**Tier 3 - Aggression Bluff** (P = 30-40%):
- Deliberately bid much higher to represent strength
- Example: Jump from "five" to "eight" to intimidate
- **When**: You're already ahead (winning the round)
- **When**: Opponent is passive
- **When**: You're about to be eliminated (desperate bluff)

**Tier 4 - Suicide Bluff** (P < 30%):
- Almost never do this
- Exception: Last round, you're about to lose anyway, crazy bluff to confuse

### 4.3 Bluff Timing Within Round

**Round Phase Affects Bluff EV**:

1. **Early** (1st-2nd bids):
   - Few dice have been "eliminated" by previous bids
   - Higher bluff success rate (fewer eyes on your lie)
   - But also: More chances for someone to challenge you
   - Good for: Tier 1-2 bluffs

2. **Mid** (3rd-5th bids):
   - Bidding has climbed significantly
   - Opponent is likely trapped (can't raise safely)
   - Opponent is more likely to doubt or spot on
   - Good for: Tier 2-3 bluffs (force them into bad position)
   - Could be: Spot on attempt (trap already set)

3. **Late** (6th+ bids):
   - Few players left who can act
   - Bids very high
   - Someone will probably challenge soon
   - Bluff success rate drops
   - Better for: Tier 3-4 (last desperate move)
   - Or: Spot on (you've read them)

### 4.4 Player-Specific Bluff Adjustment

**Aggressive Players**: Bluff more (they'll likely raise, giving you options)
**Conservative Players**: Bluff less (they'll challenge sooner)
**Predictable Players**: Bluff calculated (you can predict their response)
**Uncertain Players**: Moderate bluff (higher variance)

**Formula**:
```
bluff_threshold = base_threshold × (1 + player_aggression_factor)
- Aggressive opponent: bluff at P > 35%
- Conservative opponent: bluff at P > 55%
```

---

## 5. Statistical Models by Player Count

### 5.1 Four Players (16 total dice)

**Most Common Bids** (safe base moves):
- "One die of X": P ≈ 93.2%
- "Two dice of X": P ≈ 71.5%
- "Three dice of X": P ≈ 41.6%
- "Four dice of X": P ≈ 16.9%
- "Five dice of X": P ≈ 4.6%
- "Six+ dice of X": P < 2%

**Doubt Thresholds**:
- Below 20%: Serious doubt consideration
- 15%: Likely doubt
- 10%: Almost certain doubt
- 5%: Definitely doubt

**Bluff Targets** (Tier 2-3):
- "Three dice" (actual ~42%, bid anyway if you have 1-2)
- "Four dice" (actual ~17%, bid at ~0-1 to bluff)

### 5.2 Three Players (12 total dice)

**Shift in Base Rates**:
- "Two dice of X": P ≈ 88%
- "Three dice of X": P ≈ 64%
- "Four dice of X": P ≈ 33%
- "Five dice of X": P ≈ 10%

**Strategy Shift**:
- Conservative rounds become more valuable
- Bidding climbs slower before hitting implausible territory
- Doubt thresholds: 10% instead of 20%
- Bluff success rates drop

### 5.3 Two Players (8 total dice)

**Critical Endgame**:
- "One die": P ≈ 80%
- "Two dice": P ≈ 48%
- "Three dice": P ≈ 15%
- "Four+ dice": P < 3%

**Strategy Shift** (Major):
- **Doubt threshold drops dramatically**: ~5-10% (much harsher)
- **Bluffing becomes dangerous**: You'll likely lose
- **Spot On becomes more valuable**: 2-player scenarios are more deterministic
- **Aggression penalty**: Each loss here eliminates you
- Conservative + Defensive strategy preferred

**Two-Player Endgame Specifics**:
- You can often roughly deduce opponent's hand
- Spot On at 60%+ confidence is reasonable
- Doubt at 30%+ implausibility is reasonable
- Play more like poker: tight and selective

---

## 6. Decision Tree (Simplified)

```
START OF YOUR TURN:

  IF you_are_first_bidder:
    -> Safe bid: "one dice showing X" where X has good history
    -> OR: Make reading move (bid something to signal)
    
  ELSE (previous_bidder exists):
    
    can_raise = existing_valid_higher_bid
    
    IF can_raise AND should_raise:
      RAISE
      -> Select next bid by (a) achievability, then (b) signal value
      
    ELIF NOT can_raise:
      -> MUST doubt or spot on
      
      IF high_confidence_in_exact:
        SPOT_ON
        
      ELIF bid_very_implausible:
        DOUBT
        
      ELSE:
        DOUBT (it's your only way forward)
        
    ELSE (can raise but shouldn't):
      -> Evaluate doubt vs spot on
      
      IF P(bid_wrong) > doubt_threshold:
        DOUBT
        
      ELIF P(exact) > spot_on_threshold:
        SPOT_ON
        
      ELSE:
        DOUBT (better to win if they're wrong than to guess exact)
```

---

## 7. Implementation Details

### 7.1 State Representation

```python
class GameState:
    my_dice: List[int]  # Your visible dice
    players: List[Player]  # Other players
    bid_history: List[Bid]  # (bidder, count, face)
    current_bid: Bid  # Most recent bid
    round_phase: str  # "bidding" or "reveal"
    
class Player:
    num_dice: int  # How many they have left
    bid_history: List[Bid]  # Bids they've made this round
    success_rate: float  # Historical bid accuracy
    eliminated_this_round: bool
```

### 7.2 Probability Cache

Pre-compute binomial probabilities:
```python
# P(≥k dice showing target | n total dice)
prob_cache = {
    (n_total, k_target): float
    for n_total in range(1, 25)
    for k_target in range(1, 7)
}
```

### 7.3 Decision Scoring

```python
score(action, game_state):
    IF action == RAISE:
        return achievability_score(bid) + signal_score(bid)
    
    ELIF action == DOUBT:
        return win_probability - loss_penalty
    
    ELIF action == SPOT_ON:
        return exact_probability * big_win - wrong_loss
```

### 7.4 Learning (Optional)

Track per-player:
- `bid_accuracy[player]`: Fraction of bids that were true
- `bluff_rate[player]`: Fraction of implausible bids they make
- `doubt_rate[player]`: How often they doubt
- `success_rate_vs_me[player]`: Win rate in direct confrontations

Update thresholds based on recent history:
```python
doubt_threshold *= player.bid_accuracy_vs_me
```

---

## 8. Example: Round Walkthrough

### Scenario: 4 players, 16 dice total

**You**: 4 dice (2 threes, 2 sixes)
**Player A**: 4 dice
**Player B**: 4 dice
**Player C**: 4 dice

**Player A bids**: "Two 3's"
- P(≥2 threes | 16 dice) = 71.5%
- Very safe bid

**Your turn**:
- Your analysis: You have 2 threes. With 12 unknown dice, expect 2 more threes
- P(≥3 threes | 16 dice) = 41.6%
- Decision: RAISE to "three 3's"
  - Achievability: 41.6% (okay)
  - Signal: "I have threes" (helpful)
  - Score: Good move

**Player B bids**: "Four 3's"
- P(≥4 threes | 16 dice) = 16.9%
- Risky but not insane
- Player B has been conservative historically

**Your turn**:
- Analysis: You still expect ~4 threes total
- P(≥4 threes) = 16.9%
- Player B is reliable (high bid accuracy)
- Adjust doubt threshold: 20% × 0.9 (higher accuracy) = 18%
- 16.9% < 18% → Consider doubting
- But Player B is reliable, so maybe they have it
- Alternative: Raise to "five 3's"
  - P(≥5) = 4.6% (very risky)
- Decision: DOUBT
  - Reasoning: Bid reached low achievability territory, even with reliable bidder

**DICE REVEALED**:
- Player A: 0 threes
- You: 2 threes
- Player B: 3 threes
- Player C: 1 three
- Total: 6 threes

**Result**: Player B bid "four 3's". Actual: 6 threes.
- Bid was conservative/true
- Doubter (you) loses
- You're eliminated from this round

---

## 9. Tuning Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `doubt_threshold_4p` | 20% | Must be substantially implausible at 4 players |
| `doubt_threshold_3p` | 15% | Tighter at 3 players |
| `doubt_threshold_2p` | 8% | Very harsh at 2 players (endgame) |
| `bluff_threshold` | 45% | Bluff when bid succeeds >45% of time |
| `spot_on_confidence` | 70% | Need 70% confidence in exact to go for it |
| `spot_on_endgame_confidence` | 55% | Lower threshold when desperate |
| `player_reliability_weight` | 0.15 | Track per-player bid accuracy (15% multiplier) |
| `aggression_boost` | 1.2x | Raise more against passive players |

---

## 10. Advanced: Position and Stack Value

In multi-round tournament play:

**Value of Elimination**:
- 4p → 3p: +15% win equity
- 3p → 2p: +25% win equity  
- 2p → 1p: +50% win equity (just you left in stage)

**Adjust bluff/doubt thresholds** based on your current disadvantage:
- Losing badly? More aggressive (higher bluff threshold, lower doubt threshold)
- Winning? More conservative (lower bluff threshold, higher doubt threshold)

---

## 11. Summary: Decision Flowchart

```
YOUR TURN:

1. Calculate P(current bid is achievable)

2. IF P > 80%:
   Can raise safely → RAISE (advance the game)
   
3. IF P between 40-80%:
   Can raise but risky → RAISE if ahead, else DOUBT
   
4. IF P between 20-40%:
   Bid is suspicious → DOUBT (unless special circumstances)
   
5. IF P < 20%:
   Bid is very implausible → DOUBT (unless you're 2-players)
   
6. SPOT ON only when:
   - 70%+ confidence in exact bid, OR
   - You're losing + 55%+ confidence + desperate

7. ADJUST all thresholds by:
   - Player count (more harsh 4p→3p→2p)
   - Player reliability (more trust to good bidders)
   - Your position (more aggressive if losing)
```

---

## 12. Implementation Checklist

- [ ] Binomial probability calculator + cache
- [ ] Bid validity checker (raise progression)
- [ ] Game state tracker
- [ ] Player statistics tracker (per-player bid accuracy)
- [ ] Decision function: score_raise(bid)
- [ ] Decision function: score_doubt()
- [ ] Decision function: score_spot_on()
- [ ] Test against baseline (50% random doubts)
- [ ] Test against aggressive AI (high bid count)
- [ ] Test against conservative AI (low bid count)
- [ ] Tune thresholds on test dataset
- [ ] Implement learning updates per round

---

## 13. Testing & Tuning

**Baseline Comparisons**:
1. Random strategy (50% chance of each valid action)
2. Always raise (until can't, then doubt)
3. Always doubt (at implausibility > 30%)
4. Human player (average strategy)

**Metrics**:
- Win rate vs each baseline
- Average round survival length
- Bluff success rate
- Doubt accuracy

**Tuning Process**:
- Run 1000 simulations per parameter set
- Adjust thresholds by ±5% incrementally
- Lock in best-performing thresholds
- Test on held-out dataset