package com.example.DobBackend.repository;

import com.example.DobBackend.model.Game;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    @EntityGraph(attributePaths = { "players" })
    Optional<Game> findById(Long id);
}
