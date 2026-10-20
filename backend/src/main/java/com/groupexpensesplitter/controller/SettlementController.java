package com.groupexpensesplitter.controller;

import com.groupexpensesplitter.dto.BalanceResponse;
import com.groupexpensesplitter.dto.SettlementResponse;
import com.groupexpensesplitter.service.BalanceService;
import com.groupexpensesplitter.service.EventService;
import com.groupexpensesplitter.service.SettlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for balances and settlements.
 *
 * <ul>
 *   <li>GET   /api/events/{eventId}/balances     — Get per-participant net balances</li>
 *   <li>GET   /api/events/{eventId}/settlements  — Get settlement suggestions</li>
 *   <li>PATCH /api/settlements/{settlementId}/complete — Mark a settlement completed</li>
 * </ul>
 */
@RestController
public class SettlementController {

    private final BalanceService balanceService;
    private final SettlementService settlementService;
    private final EventService eventService;

    public SettlementController(BalanceService balanceService,
                                SettlementService settlementService,
                                EventService eventService) {
        this.balanceService = balanceService;
        this.settlementService = settlementService;
        this.eventService = eventService;
    }

    /**
     * Returns per-participant net balances for the event.
     * Also validates the event exists before computing.
     */
    @GetMapping("/api/events/{eventId}/balances")
    public ResponseEntity<List<BalanceResponse>> getBalances(@PathVariable Long eventId) {
        // Validate event exists
        eventService.findEventOrThrow(eventId);
        return ResponseEntity.ok(balanceService.getBalances(eventId));
    }

    /**
     * Generates (or refreshes) settlement suggestions for the event.
     * Returns combined PENDING + COMPLETED list.
     */
    @GetMapping("/api/events/{eventId}/settlements")
    public ResponseEntity<List<SettlementResponse>> getSettlements(@PathVariable Long eventId) {
        return ResponseEntity.ok(settlementService.getSettlements(eventId));
    }

    /**
     * Marks a PENDING settlement as COMPLETED.
     * Rejects stale or already-completed settlements.
     */
    @PatchMapping("/api/settlements/{settlementId}/complete")
    public ResponseEntity<SettlementResponse> completeSettlement(@PathVariable Long settlementId) {
        return ResponseEntity.ok(settlementService.completeSettlement(settlementId));
    }
}
