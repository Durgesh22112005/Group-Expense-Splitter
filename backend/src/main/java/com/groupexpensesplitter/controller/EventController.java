package com.groupexpensesplitter.controller;

import com.groupexpensesplitter.dto.EventRequest;
import com.groupexpensesplitter.dto.EventResponse;
import com.groupexpensesplitter.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for event management.
 *
 * <ul>
 *   <li>POST   /api/events               — Create event</li>
 *   <li>GET    /api/events               — List all events</li>
 *   <li>GET    /api/events/{eventId}     — Get single event</li>
 *   <li>DELETE /api/events/{eventId}     — Delete event (cascade)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /** Create a new event. Returns 201 Created on success. */
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request) {
        EventResponse response = eventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** Retrieve all events. */
    @GetMapping
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    /** Retrieve a single event by ID. */
    @GetMapping("/{eventId}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long eventId) {
        return ResponseEntity.ok(eventService.getEventById(eventId));
    }

    /** Delete an event and all its related records. */
    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long eventId) {
        eventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }
}
