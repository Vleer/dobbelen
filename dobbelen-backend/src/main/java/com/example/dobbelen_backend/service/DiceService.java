// DiceService.java
package com.example.dicegame.service;

import com.example.dicegame.model.Dice;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class DiceService {
    private final Random random = new Random();

    public List<Dice> rollDice(int numberOfDice) {
        List<Dice> diceList = new ArrayList<>();
        for (int i = 0; i < numberOfDice; i++) {
            diceList.add(new Dice(random.nextInt(6) + 1));
        }
        return diceList;
    }
}
