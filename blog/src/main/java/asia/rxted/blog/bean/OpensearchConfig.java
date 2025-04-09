package asia.rxted.blog.bean;

import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.nio.PoolingAsyncClientConnectionManager;
import org.apache.hc.client5.http.impl.nio.PoolingAsyncClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.ClientTlsStrategyBuilder;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.nio.ssl.TlsStrategy;
import org.opensearch.client.json.jackson.JacksonJsonpMapper;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.transport.OpenSearchTransport;
import org.opensearch.client.transport.httpclient5.ApacheHttpClient5TransportBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
@ConfigurationProperties(prefix = "opensearch")
public class OpensearchConfig {

        @Value("${opensearch.protocol}")
        private String protocol = "http";
        @Value("${opensearch.username}")
        private String username = "admin";
        @Value("${opensearch.password}")
        private String password = "admin";
        @Value("${opensearch.host}")
        private String host;
        @Value("${opensearch.port}")
        private Integer port;
        @Value("${opensearch.keyStorePath}")
        private String keyStorePath;
        @Value("${opensearch.keyStorePassword}")
        private String keyStorePassword;

        @Bean
        public OpenSearchClient openSearchClient() {
                final HttpHost origin = new HttpHost(protocol, host, port);
                final BasicCredentialsProvider provider = new BasicCredentialsProvider();
                provider.setCredentials(
                                new AuthScope(origin),
                                new UsernamePasswordCredentials(username, password.toCharArray()));

                // 安装证书
                // KeyStore keyStore;
                // SSLContext sslContext;

                // try {
                // keyStore = KeyStore.getInstance("JKS");
                // keyStore.load(new FileInputStream(keyStorePath),
                // keyStorePassword.toCharArray());
                // sslContext = SSLContextBuilder.create().loadTrustMaterial(keyStore,
                // new TrustSelfSignedStrategy()).build();

                // } catch (CertificateException | KeyStoreException | IOException |
                // NoSuchAlgorithmException
                // | KeyManagementException e) {
                // throw new RuntimeException("Failed to get keyStore instance ...");

                // }

                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.registerModule(new JavaTimeModule());
                objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
                JacksonJsonpMapper jacksonJsonpMapper = new JacksonJsonpMapper(objectMapper);

                ApacheHttpClient5TransportBuilder builder = ApacheHttpClient5TransportBuilder.builder(origin);
                builder.setHttpClientConfigCallback(
                                httpClientBuilder -> {
                                        TlsStrategy tlsStrategy = ClientTlsStrategyBuilder.create()
                                                        // .setSslContext(sslContext)
                                                        .setHostnameVerifier(new NoopHostnameVerifier()).build();
                                        PoolingAsyncClientConnectionManager connectionManager = PoolingAsyncClientConnectionManagerBuilder
                                                        .create().setTlsStrategy(tlsStrategy).build();
                                        return httpClientBuilder.setDefaultCredentialsProvider(provider)
                                                        .setConnectionManager(connectionManager);

                                });

                OpenSearchTransport transport = builder.setMapper(jacksonJsonpMapper).build();
                return new OpenSearchClient(transport);
        }
}
