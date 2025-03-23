package asia.rxted.blog.config.bean;

import org.opensearch.client.RestHighLevelClient;
import org.opensearch.data.client.orhlc.AbstractOpenSearchConfiguration;
import org.opensearch.data.client.orhlc.ClientConfiguration;
import org.opensearch.data.client.orhlc.RestClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RestClientConfig extends AbstractOpenSearchConfiguration {

    String uri = "localhost:9200";

    @Override
    @Bean
    public RestHighLevelClient opensearchClient() {

        ClientConfiguration clientConfiguration = ClientConfiguration.builder()
                .connectedTo(uri).build();
        return RestClients.create(clientConfiguration).rest();
    }
}
