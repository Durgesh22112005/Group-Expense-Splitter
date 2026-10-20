package com.groupexpensesplitter.dto;

import com.groupexpensesplitter.entity.Participant;

/** Response DTO for participant data. */
public class ParticipantResponse {

    private Long id;
    private String name;
    private Long eventId;

    public ParticipantResponse() {}

    public static ParticipantResponse from(Participant participant) {
        ParticipantResponse dto = new ParticipantResponse();
        dto.id = participant.getId();
        dto.name = participant.getName();
        dto.eventId = participant.getEvent().getId();
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public Long getEventId() { return eventId; }
}
