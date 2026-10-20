package com.groupexpensesplitter.dto;

import com.groupexpensesplitter.entity.Settlement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Response DTO for a settlement record or suggestion. */
public class SettlementResponse {

    private Long id;
    private Long eventId;
    private Long payerId;
    private String payerName;
    private Long receiverId;
    private String receiverName;
    private BigDecimal amount;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public SettlementResponse() {}

    public static SettlementResponse from(Settlement s) {
        SettlementResponse dto = new SettlementResponse();
        dto.id = s.getId();
        dto.eventId = s.getEvent().getId();
        dto.payerId = s.getPayer().getId();
        dto.payerName = s.getPayer().getName();
        dto.receiverId = s.getReceiver().getId();
        dto.receiverName = s.getReceiver().getName();
        dto.amount = s.getAmount();
        dto.status = s.getStatus().name();
        dto.createdAt = s.getCreatedAt();
        dto.completedAt = s.getCompletedAt();
        return dto;
    }

    public Long getId() { return id; }
    public Long getEventId() { return eventId; }
    public Long getPayerId() { return payerId; }
    public String getPayerName() { return payerName; }
    public Long getReceiverId() { return receiverId; }
    public String getReceiverName() { return receiverName; }
    public BigDecimal getAmount() { return amount; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
