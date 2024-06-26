@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByGameIdOrderByTimestampDesc(Long gameId);
}
