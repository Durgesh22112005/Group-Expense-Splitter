package com.groupexpensesplitter.controller;

import com.groupexpensesplitter.dto.ExpenseRequest;
import com.groupexpensesplitter.dto.ExpenseResponse;
import com.groupexpensesplitter.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for expense management within an event.
 *
 * <ul>
 *   <li>POST   /api/events/{eventId}/expenses                        — Create expense</li>
 *   <li>GET    /api/events/{eventId}/expenses                        — List expenses</li>
 *   <li>PUT    /api/events/{eventId}/expenses/{expenseId}            — Update expense</li>
 *   <li>DELETE /api/events/{eventId}/expenses/{expenseId}            — Delete expense</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/events/{eventId}/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    /** Create a new expense (splits among all or selected participants). */
    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(
            @PathVariable Long eventId,
            @Valid @RequestBody ExpenseRequest request) {
        ExpenseResponse response = expenseService.createExpense(eventId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** List all expenses for the event. */
    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getExpenses(@PathVariable Long eventId) {
        return ResponseEntity.ok(expenseService.getExpenses(eventId));
    }

    /** Fully update an existing expense (replaces all fields and recalculates shares). */
    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponse> updateExpense(
            @PathVariable Long eventId,
            @PathVariable Long expenseId,
            @Valid @RequestBody ExpenseRequest request) {
        ExpenseResponse response = expenseService.updateExpense(eventId, expenseId, request);
        return ResponseEntity.ok(response);
    }

    /** Delete an expense and its shares. */
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable Long eventId,
            @PathVariable Long expenseId) {
        expenseService.deleteExpense(eventId, expenseId);
        return ResponseEntity.noContent().build();
    }
}
