@Entity
public class Game {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String state;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Other fields like current player, current bid, etc.

    // Getters and setters
}
