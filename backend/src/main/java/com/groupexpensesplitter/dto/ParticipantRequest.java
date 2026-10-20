package com.groupexpensesplitter.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for adding a participant to an event. */
public class ParticipantRequest {

    @NotBlank(message = "Participant name is required")
    private String name;

    public ParticipantRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
