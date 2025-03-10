package asia.rxted.blog.modules.cache.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.cache.CacheProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
// @ConfigurationProperties(prefix = "spring")
public class RedisConfig {
    @Value("${spring.data.redis.host}")
    private String host;
    @Value("${spring.data.redis.port}")
    private int port;
    @Value("${spring.data.redis.database}")
    private int database;
    @Value("${spring.data.redis.password}")
    private String password;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);
        config.setDatabase(database);
        config.setPassword(password);
        LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
        return factory;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();

        redisTemplate.setConnectionFactory(factory);

        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return redisTemplate;
    }
    /****
     * @Bean
     *       public RedisCacheManager redisCacheManager(RedisConnectionFactory
     *       redisConnectionFactory,
     *       CacheProperties cacheProperties) {
     *       return RedisCacheManager
     *       .builder()
     *       .cacheDefaults(redisCacheConfiguration(cacheProperties))
     *       .build();
     *       }
     * 
     * @Bean
     *       RedisCacheConfiguration redisCacheConfiguration(CacheProperties
     *       cacheProperties) {
     *       RedisCacheConfiguration config =
     *       RedisCacheConfiguration.defaultCacheConfig();
     *       config = config.serializeKeysWith(
     *       RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.string()));
     *       config = config.serializeValuesWith(
     *       RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.json()));
     * 
     *       CacheProperties.Redis redis = cacheProperties.getRedis();
     * 
     *       if (redis.getTimeToLive() != null) {
     *       config = config.entryTtl(redis.getTimeToLive());
     *       }
     *       if (!redis.isCacheNullValues()) {
     *       config = config.disableCachingNullValues();
     *       }
     *       if (!redis.isUseKeyPrefix())
     *       config = config.disableKeyPrefix();
     *       config = config.computePrefixWith(name -> name + ':');
     * 
     *       return config;
     *       }
     * 
     */

}
