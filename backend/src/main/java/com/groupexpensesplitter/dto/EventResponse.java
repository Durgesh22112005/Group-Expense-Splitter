package com.groupexpensesplitter.dto;

import com.groupexpensesplitter.entity.Event;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Response DTO for event data — never exposes raw JPA entities. */
public class EventResponse {

    private Long id;
    private String name;
    private LocalDate eventDate;
    private LocalDateTime createdAt;

    public EventResponse() {}

    /** Factory method — maps from JPA entity to DTO. */
    public static EventResponse from(Event event) {
        EventResponse dto = new EventResponse();
        dto.id = event.getId();
        dto.name = event.getName();
        dto.eventDate = event.getEventDate();
        dto.createdAt = event.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public LocalDate getEventDate() { return eventDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
