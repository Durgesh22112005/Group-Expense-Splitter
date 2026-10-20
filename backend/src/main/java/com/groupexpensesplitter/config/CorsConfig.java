package com.groupexpensesplitter.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

/**
 * CORS configuration — allows the React development server at localhost:3000
 * to communicate with the Spring Boot backend.
 *
 * Only the required origins, methods, and headers are permitted.
 * No Spring Security dependency is added; this standalone filter is sufficient.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Allowed origins: React dev server on any local port (3000, 3001, 5173, etc.)
        config.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));

        // Standard REST methods required by the frontend
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allow common request headers
        config.setAllowedHeaders(List.of("Content-Type", "Accept", "Authorization", "X-Requested-With"));

        // Allow cookies / auth headers to be sent cross-origin if needed in future
        config.setAllowCredentials(true);

        // Cache preflight response for 1 hour
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        return new CorsFilter(source);
    }
}
