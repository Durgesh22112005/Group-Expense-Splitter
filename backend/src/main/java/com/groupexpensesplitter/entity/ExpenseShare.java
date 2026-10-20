package com.groupexpensesplitter.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Represents one participant's share of a specific expense.
 * Unique constraint prevents duplicate shares for the same expense + participant pair.
 */
@Entity
@Table(name = "expense_shares",
       uniqueConstraints = @UniqueConstraint(columnNames = {"expense_id", "participant_id"}))
public class ExpenseShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant;

    @Column(name = "share_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal shareAmount;

    public ExpenseShare() {}

    public ExpenseShare(Expense expense, Participant participant, BigDecimal shareAmount) {
        this.expense = expense;
        this.participant = participant;
        this.shareAmount = shareAmount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Expense getExpense() { return expense; }
    public void setExpense(Expense expense) { this.expense = expense; }

    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant participant) { this.participant = participant; }

    public BigDecimal getShareAmount() { return shareAmount; }
    public void setShareAmount(BigDecimal shareAmount) { this.shareAmount = shareAmount; }
}
