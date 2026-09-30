var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers();
builder.Services.Configure<StorageSettings>(builder.Configuration.GetSection("StorageSettings"));

var app = builder.Build();

app.MapDefaultEndpoints();
app.MapControllers();

app.Run();

public class StorageSettings
{
    public string ConnectionString { get; set; } = "";
}
