package com.groupexpensesplitter.service;

import com.groupexpensesplitter.dto.ParticipantRequest;
import com.groupexpensesplitter.dto.ParticipantResponse;
import com.groupexpensesplitter.entity.Event;
import com.groupexpensesplitter.entity.Participant;
import com.groupexpensesplitter.exception.BusinessRuleException;
import com.groupexpensesplitter.exception.ResourceNotFoundException;
import com.groupexpensesplitter.repository.ExpenseRepository;
import com.groupexpensesplitter.repository.ExpenseShareRepository;
import com.groupexpensesplitter.repository.ParticipantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for participant management within events.
 */
@Service
@Transactional
public class ParticipantService {

    private final ParticipantRepository participantRepository;
    private final ExpenseShareRepository expenseShareRepository;
    private final ExpenseRepository expenseRepository;
    private final EventService eventService;

    public ParticipantService(ParticipantRepository participantRepository,
                              ExpenseShareRepository expenseShareRepository,
                              ExpenseRepository expenseRepository,
                              EventService eventService) {
        this.participantRepository = participantRepository;
        this.expenseShareRepository = expenseShareRepository;
        this.expenseRepository = expenseRepository;
        this.eventService = eventService;
    }

    // -------------------------------------------------------------------------
    // Add participant
    // -------------------------------------------------------------------------

    /**
     * Adds a new participant to an event.
     *
     * @param eventId target event ID
     * @param request participant name
     * @return response DTO for the created participant
     * @throws ResourceNotFoundException if the event does not exist
     */
    public ParticipantResponse addParticipant(Long eventId, ParticipantRequest request) {
        Event event = eventService.findEventOrThrow(eventId);

        Participant participant = new Participant();
        participant.setName(request.getName().trim());
        participant.setEvent(event);

        Participant saved = participantRepository.save(participant);
        return ParticipantResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // Get participants for an event
    // -------------------------------------------------------------------------

    /**
     * Returns all participants for the given event.
     */
    @Transactional(readOnly = true)
    public List<ParticipantResponse> getParticipants(Long eventId) {
        // Verify event exists
        eventService.findEventOrThrow(eventId);
        return participantRepository.findByEventId(eventId).stream()
                .map(ParticipantResponse::from)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Remove participant
    // -------------------------------------------------------------------------

    /**
     * Removes a participant from an event, but only if doing so will not
     * leave orphaned financial records (expense shares or expenses paid by this participant).
     *
     * @param eventId       event the participant belongs to
     * @param participantId participant to remove
     * @throws ResourceNotFoundException if event or participant not found
     * @throws BusinessRuleException     if the participant has existing financial records
     */
    public void removeParticipant(Long eventId, Long participantId) {
        // Validate event exists
        eventService.findEventOrThrow(eventId);

        // Validate participant belongs to this event
        Participant participant = participantRepository.findByIdAndEventId(participantId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Participant not found with id: " + participantId + " in event: " + eventId));

        // Guard: participant has expense shares (they are a beneficiary of at least one expense)
        if (expenseShareRepository.existsByParticipantId(participantId)) {
            throw new BusinessRuleException(
                    "Cannot remove participant '" + participant.getName() + "' because they have expense shares. " +
                    "Delete the related expenses first.");
        }

        // Guard: participant is the payer of at least one expense
        boolean isPayer = expenseRepository.findByEventId(eventId).stream()
                .anyMatch(e -> e.getPayer().getId().equals(participantId));
        if (isPayer) {
            throw new BusinessRuleException(
                    "Cannot remove participant '" + participant.getName() + "' because they are the payer of one or more expenses. " +
                    "Delete the related expenses first.");
        }

        participantRepository.delete(participant);
    }

    // -------------------------------------------------------------------------
    // Internal helper
    // -------------------------------------------------------------------------

    /**
     * Loads a Participant that belongs to the specified event, or throws 404.
     */
    public Participant findParticipantInEvent(Long participantId, Long eventId) {
        return participantRepository.findByIdAndEventId(participantId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Participant not found with id: " + participantId + " in event: " + eventId));
    }
}
