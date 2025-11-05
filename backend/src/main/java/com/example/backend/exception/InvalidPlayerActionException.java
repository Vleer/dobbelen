package com.example.backend.exception;

public class InvalidPlayerActionException extends RuntimeException {
    public InvalidPlayerActionException(String message) {
        super(message);
    }
}
