package com.example.dobbelen_backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Random;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.dobbelen_backend.service.DiceService;
import com.example.dobbelen_backend.model.Dice;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:48081", "http://localhost:3000"})
public class HelloWorldController {
    
    @Autowired
    private DiceService diceService;

    @GetMapping("/hello")
    public String hello() {
        return "Hello, World!";
    }

    @GetMapping("/roll")
    public List<Dice> rollDice(@RequestParam(name = "count", defaultValue = "5") int count) {
        return diceService.rollDice(count);
    }

    // @Autowired
    // private DiceService diceService;

    // @GetMapping("/roll")
    // public List<Dice> rollDice(@RequestParam(name = "count", defaultValue = "5") int count) {
    //     return diceService.rollDice(count);
    // }

}
