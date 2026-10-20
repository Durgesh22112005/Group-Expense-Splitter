package com.groupexpensesplitter.controller;

import com.groupexpensesplitter.dto.ParticipantRequest;
import com.groupexpensesplitter.dto.ParticipantResponse;
import com.groupexpensesplitter.service.ParticipantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for participant management within an event.
 *
 * <ul>
 *   <li>POST   /api/events/{eventId}/participants                                  — Add participant</li>
 *   <li>GET    /api/events/{eventId}/participants                                  — List participants</li>
 *   <li>DELETE /api/events/{eventId}/participants/{participantId}                 — Remove participant</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/events/{eventId}/participants")
public class ParticipantController {

    private final ParticipantService participantService;

    public ParticipantController(ParticipantService participantService) {
        this.participantService = participantService;
    }

    /** Add a new participant to the event. */
    @PostMapping
    public ResponseEntity<ParticipantResponse> addParticipant(
            @PathVariable Long eventId,
            @Valid @RequestBody ParticipantRequest request) {
        ParticipantResponse response = participantService.addParticipant(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** Retrieve all participants for the event. */
    @GetMapping
    public ResponseEntity<List<ParticipantResponse>> getParticipants(@PathVariable Long eventId) {
        return ResponseEntity.ok(participantService.getParticipants(eventId));
    }

    /** Remove a participant (only if they have no financial records). */
    @DeleteMapping("/{participantId}")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable Long eventId,
            @PathVariable Long participantId) {
        participantService.removeParticipant(eventId, participantId);
        return ResponseEntity.noContent().build();
    }
}
