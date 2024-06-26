@Configuration
public class RabbitMQConfig {

    @Bean
    public Queue gameQueue() {
        return new Queue("gameQueue", false);
    }

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange("gameExchange");
    }

    @Bean
    public Binding binding(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("game.#");
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(GameMessageReceiver receiver) {
        return new MessageListenerAdapter(receiver, "receiveMessage");
    }

    @Bean
    public SimpleMessageListenerContainer container(ConnectionFactory connectionFactory,
            MessageListenerAdapter listenerAdapter) {
        SimpleMessageListenerContainer container = new SimpleMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.setQueueNames("gameQueue");
        container.setMessageListener(listenerAdapter);
        return container;
    }
}
