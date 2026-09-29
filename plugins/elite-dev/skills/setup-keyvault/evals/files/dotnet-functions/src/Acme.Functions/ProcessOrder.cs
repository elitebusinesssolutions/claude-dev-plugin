using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Acme.Functions;

public class ProcessOrder(ILogger<ProcessOrder> logger)
{
    [Function(nameof(ProcessOrder))]
    public void Run([QueueTrigger("orders", Connection = "StorageSettings:ConnectionString")] string message)
    {
        logger.LogInformation("Order received: {Message}", message);
    }
}
