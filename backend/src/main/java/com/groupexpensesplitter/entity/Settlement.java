package com.groupexpensesplitter.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents a suggested or completed payment transfer between two participants.
 */
@Entity
@Table(name = "settlements", indexes = {
    @Index(name = "idx_settlements_event_status", columnList = "event_id, status")
})
public class Settlement {

    public enum Status { PENDING, COMPLETED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /** The participant who owes money. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payer_id", nullable = false)
    private Participant payer;

    /** The participant who should receive money. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private Participant receiver;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Snapshot of total expenses at the time this settlement was generated.
     * Used to detect staleness when completing a settlement.
     */
    @Column(name = "snapshot_expense_count", nullable = false)
    private int snapshotExpenseCount;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Settlement() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public Participant getPayer() { return payer; }
    public void setPayer(Participant payer) { this.payer = payer; }

    public Participant getReceiver() { return receiver; }
    public void setReceiver(Participant receiver) { this.receiver = receiver; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public int getSnapshotExpenseCount() { return snapshotExpenseCount; }
    public void setSnapshotExpenseCount(int snapshotExpenseCount) { this.snapshotExpenseCount = snapshotExpenseCount; }
}
