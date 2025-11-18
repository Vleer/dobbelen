package com.example.backend.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface GameMongoRepository extends MongoRepository<GameDocument, String> {
}
