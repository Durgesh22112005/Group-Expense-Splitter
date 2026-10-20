package com.groupexpensesplitter.service;

import com.groupexpensesplitter.dto.EventRequest;
import com.groupexpensesplitter.dto.EventResponse;
import com.groupexpensesplitter.entity.Event;
import com.groupexpensesplitter.exception.ResourceNotFoundException;
import com.groupexpensesplitter.repository.EventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for event management.
 */
@Service
@Transactional
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Creates a new event from the given request.
     *
     * @param request validated event data
     * @return response DTO for the created event
     */
    public EventResponse createEvent(EventRequest request) {
        Event event = new Event();
        event.setName(request.getName().trim());
        event.setEventDate(request.getEventDate());
        Event saved = eventRepository.save(event);
        return EventResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /**
     * Returns all events ordered by creation time (newest first via database ordering).
     */
    @Transactional(readOnly = true)
    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll().stream()
                .map(EventResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Returns a single event by ID.
     *
     * @throws ResourceNotFoundException if no event exists with the given ID
     */
    @Transactional(readOnly = true)
    public EventResponse getEventById(Long eventId) {
        Event event = findEventOrThrow(eventId);
        return EventResponse.from(event);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Deletes an event and all its related records (participants, expenses, shares, settlements)
     * via JPA cascade delete.
     *
     * @throws ResourceNotFoundException if no event exists with the given ID
     */
    public void deleteEvent(Long eventId) {
        Event event = findEventOrThrow(eventId);
        event.getSettlements().clear();
        event.getExpenses().clear();
        eventRepository.saveAndFlush(event);
        eventRepository.delete(event);
    }

    // -------------------------------------------------------------------------
    // Internal helper
    // -------------------------------------------------------------------------

    /**
     * Loads an Event entity or throws 404.
     */
    public Event findEventOrThrow(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Event not found with id: " + eventId));
    }
}
