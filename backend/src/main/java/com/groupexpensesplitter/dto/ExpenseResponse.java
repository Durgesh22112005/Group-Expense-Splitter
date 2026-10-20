package com.groupexpensesplitter.dto;

import com.groupexpensesplitter.entity.Expense;
import com.groupexpensesplitter.entity.ExpenseShare;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/** Response DTO for expense data, including per-participant share breakdown. */
public class ExpenseResponse {

    private Long id;
    private String description;
    private String category;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private Long eventId;
    private Long payerId;
    private String payerName;
    private String receiptUrl;
    private List<ShareResponse> shares;

    public ExpenseResponse() {}

    public static ExpenseResponse from(Expense expense) {
        ExpenseResponse dto = new ExpenseResponse();
        dto.id = expense.getId();
        dto.description = expense.getDescription();
        dto.category = expense.getCategory();
        dto.amount = expense.getAmount();
        dto.expenseDate = expense.getExpenseDate();
        dto.eventId = expense.getEvent().getId();
        dto.payerId = expense.getPayer().getId();
        dto.payerName = expense.getPayer().getName();
        dto.receiptUrl = expense.getReceiptUrl();
        dto.shares = expense.getShares().stream()
                .map(ShareResponse::from)
                .collect(Collectors.toList());
        return dto;
    }

    // Getters
    public Long getId() { return id; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public BigDecimal getAmount() { return amount; }
    public LocalDate getExpenseDate() { return expenseDate; }
    public Long getEventId() { return eventId; }
    public Long getPayerId() { return payerId; }
    public String getPayerName() { return payerName; }
    public String getReceiptUrl() { return receiptUrl; }
    public List<ShareResponse> getShares() { return shares; }

    // -------------------------------------------------------------------------
    // Nested DTO for each share entry
    // -------------------------------------------------------------------------

    public static class ShareResponse {
        private Long participantId;
        private String participantName;
        private BigDecimal shareAmount;

        public static ShareResponse from(ExpenseShare es) {
            ShareResponse s = new ShareResponse();
            s.participantId = es.getParticipant().getId();
            s.participantName = es.getParticipant().getName();
            s.shareAmount = es.getShareAmount();
            return s;
        }

        public Long getParticipantId() { return participantId; }
        public String getParticipantName() { return participantName; }
        public BigDecimal getShareAmount() { return shareAmount; }
    }
}
