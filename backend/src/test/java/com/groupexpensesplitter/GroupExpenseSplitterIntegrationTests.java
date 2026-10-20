package com.groupexpensesplitter;

import com.groupexpensesplitter.dto.*;
import com.groupexpensesplitter.entity.Settlement;
import com.groupexpensesplitter.exception.BusinessRuleException;
import com.groupexpensesplitter.exception.ResourceNotFoundException;
import com.groupexpensesplitter.repository.*;
import com.groupexpensesplitter.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Integration tests for the Group Expense Splitter backend.
 *
 * <p>Uses an H2 in-memory database (configured in {@code src/test/resources/application.properties}).
 * No external MySQL server is required.
 *
 * <p>Tests are ordered to demonstrate a full lifecycle scenario and also individual edge cases.
 */
@SpringBootTest
@Transactional  // Each test runs in a transaction that is rolled back afterward — keeps tests independent
class GroupExpenseSplitterIntegrationTests {

    @Autowired EventService eventService;
    @Autowired ParticipantService participantService;
    @Autowired ExpenseService expenseService;
    @Autowired BalanceService balanceService;
    @Autowired SettlementService settlementService;
    @Autowired SettlementRepository settlementRepository;
    @Autowired ExpenseRepository expenseRepository;

    // =========================================================================
    // Helper factory methods
    // =========================================================================

    private EventResponse createEvent(String name) {
        EventRequest req = new EventRequest();
        req.setName(name);
        req.setEventDate(LocalDate.now());
        return eventService.createEvent(req);
    }

    private ParticipantResponse addParticipant(Long eventId, String name) {
        ParticipantRequest req = new ParticipantRequest();
        req.setName(name);
        return participantService.addParticipant(eventId, req);
    }

    private ExpenseResponse addExpense(Long eventId, String desc, String cat,
                                       String amount, Long payerId, List<Long> beneficiaries) {
        ExpenseRequest req = new ExpenseRequest();
        req.setDescription(desc);
        req.setCategory(cat);
        req.setAmount(new BigDecimal(amount));
        req.setExpenseDate(LocalDate.now());
        req.setPayerId(payerId);
        req.setBeneficiaryIds(beneficiaries);
        return expenseService.createExpense(eventId, req);
    }

    // =========================================================================
    // Event tests
    // =========================================================================

    @Test
    @DisplayName("Create and retrieve an event")
    void testCreateAndRetrieveEvent() {
        EventResponse event = createEvent("Goa Trip");

        assertThat(event.getId()).isNotNull();
        assertThat(event.getName()).isEqualTo("Goa Trip");
        assertThat(event.getCreatedAt()).isNotNull();

        EventResponse fetched = eventService.getEventById(event.getId());
        assertThat(fetched.getName()).isEqualTo("Goa Trip");
    }

    @Test
    @DisplayName("Retrieve all events returns correct count")
    void testGetAllEvents() {
        createEvent("Trip A");
        createEvent("Trip B");

        List<EventResponse> events = eventService.getAllEvents();
        assertThat(events).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("Getting a non-existent event throws ResourceNotFoundException")
    void testGetNonExistentEvent() {
        assertThatThrownBy(() -> eventService.getEventById(999999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Delete event removes all related records")
    void testDeleteEvent() {
        EventResponse event = createEvent("Delete Me");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        addExpense(eventId, "Dinner", "Food", "100.00", alice.getId(), null);
        settlementService.getSettlements(eventId);

        eventService.deleteEvent(eventId);

        assertThatThrownBy(() -> eventService.getEventById(eventId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // =========================================================================
    // Participant tests
    // =========================================================================

    @Test
    @DisplayName("Add and retrieve participants for an event")
    void testParticipantManagement() {
        EventResponse event = createEvent("Dinner");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        assertThat(alice.getId()).isNotNull();
        assertThat(bob.getEventId()).isEqualTo(eventId);

        List<ParticipantResponse> participants = participantService.getParticipants(eventId);
        assertThat(participants).hasSize(2);
        assertThat(participants).extracting(ParticipantResponse::getName)
                .containsExactlyInAnyOrder("Alice", "Bob");
    }

    @Test
    @DisplayName("Participant cannot be removed if they have expense shares")
    void testCannotRemoveParticipantWithExpenseShares() {
        EventResponse event = createEvent("Party");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        // Alice pays for both; Bob is a beneficiary
        addExpense(eventId, "Pizza", "Food", "100.00", alice.getId(),
                List.of(alice.getId(), bob.getId()));

        // Trying to remove Bob (who has a share) should fail
        assertThatThrownBy(() -> participantService.removeParticipant(eventId, bob.getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("expense shares");
    }

    @Test
    @DisplayName("Participant can be removed if they have no financial records")
    void testRemoveParticipantWithNoFinancialRecords() {
        EventResponse event = createEvent("Meeting");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        // Alice pays, only Alice is a beneficiary — Bob has no records
        addExpense(eventId, "Coffee", "Drinks", "50.00", alice.getId(), List.of(alice.getId()));

        // Bob should be removable
        assertThatNoException().isThrownBy(() -> participantService.removeParticipant(eventId, bob.getId()));
    }

    @Test
    @DisplayName("Participant from a different event cannot be accessed via wrong event")
    void testParticipantBelongsToCorrectEvent() {
        EventResponse e1 = createEvent("Event 1");
        EventResponse e2 = createEvent("Event 2");

        ParticipantResponse p1 = addParticipant(e1.getId(), "Alice");

        assertThatThrownBy(() -> participantService.removeParticipant(e2.getId(), p1.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // =========================================================================
    // Expense tests — equal splitting
    // =========================================================================

    @Test
    @DisplayName("Expense split equally among all participants — exact shares")
    void testEqualSplitAllParticipants() {
        EventResponse event = createEvent("Trip");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");
        ParticipantResponse charlie = addParticipant(eventId, "Charlie");

        // ₹100 split 3 ways: 33.34 + 33.33 + 33.33 = 100.00
        ExpenseResponse expense = addExpense(eventId, "Hotel", "Accommodation", "100.00",
                alice.getId(), null); // null = all participants

        assertThat(expense.getShares()).hasSize(3);

        BigDecimal totalShares = expense.getShares().stream()
                .map(ExpenseResponse.ShareResponse::getShareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalShares).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("Expense split among selected beneficiaries only")
    void testEqualSplitSelectedBeneficiaries() {
        EventResponse event = createEvent("Weekend");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");
        ParticipantResponse charlie = addParticipant(eventId, "Charlie");

        // Only Alice and Bob share this expense; Charlie is not included
        ExpenseResponse expense = addExpense(eventId, "Museum", "Entertainment", "50.00",
                alice.getId(), List.of(alice.getId(), bob.getId()));

        assertThat(expense.getShares()).hasSize(2);

        BigDecimal totalShares = expense.getShares().stream()
                .map(ExpenseResponse.ShareResponse::getShareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalShares).isEqualByComparingTo("50.00");
    }

    @Test
    @DisplayName("Decimal remainder distributed correctly — total always matches expense amount")
    void testDecimalRoundingPreservesTotal() {
        EventResponse event = createEvent("Rounding Test");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");
        ParticipantResponse charlie = addParticipant(eventId, "Charlie");

        // ₹10 / 3 = 3.33... → 3.34 + 3.33 + 3.33 = 10.00
        ExpenseResponse e1 = addExpense(eventId, "Snacks", "Food", "10.00",
                alice.getId(), null);

        BigDecimal total = e1.getShares().stream()
                .map(ExpenseResponse.ShareResponse::getShareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo("10.00");

        // ₹1 / 3 = 0.33... → 0.34 + 0.33 + 0.33 = 1.00
        ExpenseResponse e2 = addExpense(eventId, "Candy", "Food", "1.00",
                bob.getId(), null);
        BigDecimal total2 = e2.getShares().stream()
                .map(ExpenseResponse.ShareResponse::getShareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total2).isEqualByComparingTo("1.00");
    }

    @Test
    @DisplayName("Payer does not need to be a beneficiary")
    void testPayerNotRequiredToBeBeneficiary() {
        EventResponse event = createEvent("Venue");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        // Alice pays, but only Bob is a beneficiary
        ExpenseResponse expense = addExpense(eventId, "Bus", "Transport", "60.00",
                alice.getId(), List.of(bob.getId()));

        assertThat(expense.getPayerId()).isEqualTo(alice.getId());
        assertThat(expense.getShares()).hasSize(1);
        assertThat(expense.getShares().get(0).getParticipantId()).isEqualTo(bob.getId());
        assertThat(expense.getShares().get(0).getShareAmount()).isEqualByComparingTo("60.00");
    }

    @Test
    @DisplayName("Beneficiary from a different event is rejected")
    void testBeneficiaryFromWrongEventIsRejected() {
        EventResponse e1 = createEvent("Event 1");
        EventResponse e2 = createEvent("Event 2");

        ParticipantResponse alice = addParticipant(e1.getId(), "Alice");
        ParticipantResponse outsider = addParticipant(e2.getId(), "Outsider");

        // Try to add an expense in e1 with a participant from e2 as beneficiary
        assertThatThrownBy(() ->
                addExpense(e1.getId(), "Dinner", "Food", "100.00",
                        alice.getId(), List.of(outsider.getId())))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Update expense recalculates shares and invalidates pending settlements")
    void testUpdateExpense() {
        EventResponse event = createEvent("Office");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        ExpenseResponse original = addExpense(eventId, "Lunch", "Food", "100.00",
                alice.getId(), null);

        // Generate settlements
        settlementService.getSettlements(eventId);
        assertThat(settlementRepository.existsByEventIdAndStatus(eventId, Settlement.Status.PENDING)).isTrue();

        // Update expense — this should wipe PENDING settlements
        ExpenseRequest updateReq = new ExpenseRequest();
        updateReq.setDescription("Dinner");
        updateReq.setCategory("Food");
        updateReq.setAmount(new BigDecimal("200.00"));
        updateReq.setExpenseDate(LocalDate.now());
        updateReq.setPayerId(alice.getId());
        updateReq.setBeneficiaryIds(null);

        expenseService.updateExpense(eventId, original.getId(), updateReq);

        assertThat(settlementRepository.existsByEventIdAndStatus(eventId, Settlement.Status.PENDING)).isFalse();
    }

    @Test
    @DisplayName("Delete expense removes its shares and invalidates pending settlements")
    void testDeleteExpense() {
        EventResponse event = createEvent("Camping");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        addParticipant(eventId, "Bob");

        ExpenseResponse expense = addExpense(eventId, "Tent", "Gear", "300.00",
                alice.getId(), null);

        settlementService.getSettlements(eventId);
        assertThat(settlementRepository.existsByEventIdAndStatus(eventId, Settlement.Status.PENDING)).isTrue();

        expenseService.deleteExpense(eventId, expense.getId());

        assertThat(settlementRepository.existsByEventIdAndStatus(eventId, Settlement.Status.PENDING)).isFalse();
        assertThat(expenseRepository.findByEventId(eventId)).isEmpty();
    }

    // =========================================================================
    // Balance tests
    // =========================================================================

    @Test
    @DisplayName("Sum of all balances is always zero")
    void testBalanceSumIsZero() {
        EventResponse event = createEvent("Balance Test");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");
        ParticipantResponse charlie = addParticipant(eventId, "Charlie");

        addExpense(eventId, "Hotel", "Stay", "300.00", alice.getId(), null);
        addExpense(eventId, "Food", "Meals", "150.00", bob.getId(), null);
        addExpense(eventId, "Fuel", "Transport", "90.00", charlie.getId(), null);

        List<BalanceResponse> balances = balanceService.getBalances(eventId);

        BigDecimal sum = balances.stream()
                .map(BalanceResponse::getNetBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(sum).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Balance correctly identified as OWES, GETS_BACK, or SETTLED")
    void testBalanceStatusClassification() {
        EventResponse event = createEvent("Status Test");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");
        ParticipantResponse charlie = addParticipant(eventId, "Charlie");

        // Alice pays ₹90, everyone owes ₹30 each
        // Alice net: 90 - 30 = +60 → GETS_BACK
        // Bob net:    0 - 30 = -30 → OWES
        // Charlie net: 0 - 30 = -30 → OWES
        addExpense(eventId, "Taxi", "Transport", "90.00", alice.getId(), null);

        List<BalanceResponse> balances = balanceService.getBalances(eventId);

        BalanceResponse aliceBalance = balances.stream()
                .filter(b -> b.getParticipantId().equals(alice.getId())).findFirst().orElseThrow();
        BalanceResponse bobBalance = balances.stream()
                .filter(b -> b.getParticipantId().equals(bob.getId())).findFirst().orElseThrow();

        assertThat(aliceBalance.getStatus()).isEqualTo(BalanceResponse.FinancialStatus.GETS_BACK);
        assertThat(bobBalance.getStatus()).isEqualTo(BalanceResponse.FinancialStatus.OWES);
        assertThat(aliceBalance.getNetBalance()).isEqualByComparingTo("60.00");
        assertThat(bobBalance.getNetBalance()).isEqualByComparingTo("-30.00");
    }

    // =========================================================================
    // Settlement tests
    // =========================================================================

    @Test
    @DisplayName("Settlement generation with multiple debtors and creditors")
    void testSettlementGenerationMultipleDebtorsCreditors() {
        EventResponse event = createEvent("Settlement Test");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");  // pays 300
        ParticipantResponse bob = addParticipant(eventId, "Bob");      // pays 0
        ParticipantResponse charlie = addParticipant(eventId, "Charlie"); // pays 0

        // Alice pays ₹300 for all three: each owes ₹100, Alice gets back ₹200
        addExpense(eventId, "Hotel", "Stay", "300.00", alice.getId(), null);

        List<SettlementResponse> settlements = settlementService.getSettlements(eventId);

        // Total settlement amount must equal ₹200 (what Alice is owed)
        BigDecimal totalSettled = settlements.stream()
                .filter(s -> s.getStatus().equals("PENDING"))
                .map(SettlementResponse::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalSettled).isEqualByComparingTo("200.00");
        assertThat(settlements.stream().filter(s -> s.getStatus().equals("PENDING")).count()).isEqualTo(2);
    }

    @Test
    @DisplayName("No settlements generated when all balances are zero")
    void testNoSettlementRequiredWhenBalanced() {
        EventResponse event = createEvent("Balanced Event");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        // Alice pays for Bob (₹50), Bob pays for Alice (₹50) — perfectly balanced
        addExpense(eventId, "Alice's bill", "Food", "50.00", alice.getId(), List.of(bob.getId()));
        addExpense(eventId, "Bob's bill", "Food", "50.00", bob.getId(), List.of(alice.getId()));

        List<SettlementResponse> settlements = settlementService.getSettlements(eventId);
        long pendingCount = settlements.stream().filter(s -> "PENDING".equals(s.getStatus())).count();
        assertThat(pendingCount).isEqualTo(0);
    }

    @Test
    @DisplayName("Settlement completion marks PENDING as COMPLETED with timestamp")
    void testCompleteSettlement() {
        EventResponse event = createEvent("Complete Test");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        addExpense(eventId, "Dinner", "Food", "100.00", alice.getId(), null);

        List<SettlementResponse> settlements = settlementService.getSettlements(eventId);
        SettlementResponse pending = settlements.stream()
                .filter(s -> "PENDING".equals(s.getStatus())).findFirst().orElseThrow();

        SettlementResponse completed = settlementService.completeSettlement(pending.getId());

        assertThat(completed.getStatus()).isEqualTo("COMPLETED");
        assertThat(completed.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("Completing an already-completed settlement throws BusinessRuleException")
    void testDuplicateSettlementCompletion() {
        EventResponse event = createEvent("Duplicate Complete");
        Long eventId = event.getId();

        addParticipant(eventId, "Alice");
        addParticipant(eventId, "Bob");

        ParticipantResponse alice = participantService.getParticipants(eventId).get(0);
        addExpense(eventId, "Lunch", "Food", "80.00", alice.getId(), null);

        List<SettlementResponse> settlements = settlementService.getSettlements(eventId);
        SettlementResponse pending = settlements.stream()
                .filter(s -> "PENDING".equals(s.getStatus())).findFirst().orElseThrow();

        settlementService.completeSettlement(pending.getId());

        assertThatThrownBy(() -> settlementService.completeSettlement(pending.getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("already completed");
    }

    @Test
    @DisplayName("Stale settlement cannot be completed after expenses change")
    void testStaleSettlementPrevented() {
        EventResponse event = createEvent("Stale Test");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        addExpense(eventId, "Taxi", "Transport", "100.00", alice.getId(), null);

        List<SettlementResponse> settlements = settlementService.getSettlements(eventId);
        SettlementResponse pending = settlements.stream()
                .filter(s -> "PENDING".equals(s.getStatus())).findFirst().orElseThrow();

        // Now add another expense — this invalidates PENDING settlements,
        // but the snapshot on 'pending' still says expenseCount=1
        addExpense(eventId, "Hotel", "Stay", "200.00", bob.getId(), null);

        // pending was deleted by the invalidation, but let's test staleness via snapshot
        // Re-generate so we get a new PENDING record with snapshot=2
        settlementService.getSettlements(eventId);

        // The original 'pending' settlement (snapshot=1) no longer exists (was deleted).
        // Trying to complete it should throw ResourceNotFoundException
        Long originalId = pending.getId();
        assertThatThrownBy(() -> settlementService.completeSettlement(originalId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Calling getSettlements repeatedly does not create duplicate PENDING records")
    void testNoDuplicatePendingSettlements() {
        EventResponse event = createEvent("Idempotent");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        addParticipant(eventId, "Bob");

        addExpense(eventId, "Food", "Meals", "100.00", alice.getId(), null);

        settlementService.getSettlements(eventId);
        settlementService.getSettlements(eventId);
        settlementService.getSettlements(eventId);

        long pendingCount = settlementRepository.findByEventId(eventId).stream()
                .filter(s -> s.getStatus() == Settlement.Status.PENDING).count();

        // Should be at most 1 PENDING (Alice paid, Bob owes)
        assertThat(pendingCount).isEqualTo(1);
    }

    @Test
    @DisplayName("Create and update expense with bill receipt screenshot")
    void testCreateExpenseWithReceipt() {
        EventResponse event = createEvent("Receipt Event");
        Long eventId = event.getId();

        ParticipantResponse alice = addParticipant(eventId, "Alice");
        ParticipantResponse bob = addParticipant(eventId, "Bob");

        ExpenseRequest req = new ExpenseRequest();
        req.setDescription("Cafe Bill");
        req.setCategory("Food");
        req.setAmount(new BigDecimal("150.00"));
        req.setExpenseDate(LocalDate.now());
        req.setPayerId(alice.getId());
        req.setReceiptUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

        ExpenseResponse created = expenseService.createExpense(eventId, req);
        assertThat(created.getReceiptUrl()).isNotNull();
        assertThat(created.getReceiptUrl()).startsWith("data:image/png;base64");

        // Update receipt
        req.setReceiptUrl("data:image/jpeg;base64,updatedImageData");
        ExpenseResponse updated = expenseService.updateExpense(eventId, created.getId(), req);
        assertThat(updated.getReceiptUrl()).isEqualTo("data:image/jpeg;base64,updatedImageData");
    }
}
