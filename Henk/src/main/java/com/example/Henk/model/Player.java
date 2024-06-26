@Entity
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private int diceCount;
    private Long gameId;

    // Getters and setters
}
