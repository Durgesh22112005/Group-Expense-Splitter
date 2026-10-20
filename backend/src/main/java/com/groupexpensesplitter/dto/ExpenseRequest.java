package com.groupexpensesplitter.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Request body for creating or updating an expense. */
public class ExpenseRequest {

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 13, fraction = 2, message = "Amount must have at most 13 integer digits and 2 decimal places")
    private BigDecimal amount;

    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    @NotNull(message = "Payer ID is required")
    private Long payerId;

    /**
     * Optional list of beneficiary participant IDs.
     * If null or empty, the expense is split equally among ALL event participants.
     * If provided, only those participants share the expense.
     */
    private List<Long> beneficiaryIds;

    public ExpenseRequest() {}

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }

    public Long getPayerId() { return payerId; }
    public void setPayerId(Long payerId) { this.payerId = payerId; }

    /**
     * Optional receipt / bill image URL or Base64 data URL.
     */
    private String receiptUrl;

    public List<Long> getBeneficiaryIds() { return beneficiaryIds; }
    public void setBeneficiaryIds(List<Long> beneficiaryIds) { this.beneficiaryIds = beneficiaryIds; }

    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }
}
