namespace ExampleApp.Services;

public class PricingService : IPricingService
{
    private readonly IDiscountRateProvider _rates;

    public PricingService(IDiscountRateProvider rates)
    {
        _rates = rates;
    }

    /// <summary>
    /// Returns the volume discount for a quantity, as a fraction between 0 and 1.
    /// Returns 0 when the quantity is below the first configured tier.
    /// </summary>
    public decimal CalculateVolumeDiscount(int quantity)
    {
        var tier = _rates.GetTierForQuantity(quantity);
        return tier?.Rate ?? 0m;
    }

    public decimal ApplyDiscount(decimal amount, decimal discount)
    {
        return decimal.Round(amount * (1m - discount), 2);
    }
}
