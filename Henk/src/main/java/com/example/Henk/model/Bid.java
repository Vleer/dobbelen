@Entity
public class Bid {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long gameId;
    private Long playerId;
    private int diceFace;
    private int count;
    private LocalDateTime timestamp;

    // Getters and setters
}
