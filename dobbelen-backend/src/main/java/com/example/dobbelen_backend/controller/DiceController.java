// // DiceController.java
// package com.example.dicegame.controller;

// import com.example.dicegame.model.Dice;
// import com.example.dicegame.service.DiceService;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;

// import java.util.List;

// @RestController
// @CrossOrigin(origins = {"http://localhost:48081", "http://localhost:3000"})
// public class DiceController {

//     @Autowired
//     private DiceService diceService;

//     @GetMapping("/roll")
//     public List<Dice> rollDice(@RequestParam(name = "count", defaultValue = "5") int count) {
//         return diceService.rollDice(count);
//     }
// }
