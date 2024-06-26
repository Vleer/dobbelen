// // DiceController.java
// package com.example.Henk.controller;

// import com.example.Henk.model.Dice;
// import com.example.Henk.service.DiceService;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;

// import java.util.List;

// @RestController
// @CrossOrigin(origins = {"http://localhost:48081", "http://localhost:3000"})
// public class DiceController {

// @Autowired
// private DiceService diceService;

// @GetMapping("/roll")
// public List<Dice> rollDice(@RequestParam(name = "count", defaultValue = "5")
// int count) {
// return diceService.rollDice(count);
// }
// }
