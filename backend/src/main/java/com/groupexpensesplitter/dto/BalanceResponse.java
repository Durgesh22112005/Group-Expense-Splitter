package com.groupexpensesplitter.dto;

import java.math.BigDecimal;

/**
 * Response DTO representing a participant's net financial position within an event.
 * <p>
 * Net Balance = Total Paid - Total Share
 * <ul>
 *   <li>Positive net balance → participant GETS_BACK money</li>
 *   <li>Negative net balance → participant OWES money</li>
 *   <li>Zero → SETTLED</li>
 * </ul>
 */
public class BalanceResponse {

    public enum FinancialStatus { OWES, GETS_BACK, SETTLED }

    private Long participantId;
    private String participantName;
    private BigDecimal totalPaid;
    private BigDecimal totalShare;
    private BigDecimal netBalance;
    private FinancialStatus status;

    public BalanceResponse() {}

    public BalanceResponse(Long participantId, String participantName,
                           BigDecimal totalPaid, BigDecimal totalShare, BigDecimal netBalance) {
        this.participantId = participantId;
        this.participantName = participantName;
        this.totalPaid = totalPaid;
        this.totalShare = totalShare;
        this.netBalance = netBalance;

        // Determine status based on net balance sign
        int cmp = netBalance.compareTo(BigDecimal.ZERO);
        if (cmp > 0) {
            this.status = FinancialStatus.GETS_BACK;
        } else if (cmp < 0) {
            this.status = FinancialStatus.OWES;
        } else {
            this.status = FinancialStatus.SETTLED;
        }
    }

    public Long getParticipantId() { return participantId; }
    public String getParticipantName() { return participantName; }
    public BigDecimal getTotalPaid() { return totalPaid; }
    public BigDecimal getTotalShare() { return totalShare; }
    public BigDecimal getNetBalance() { return netBalance; }
    public FinancialStatus getStatus() { return status; }
}
