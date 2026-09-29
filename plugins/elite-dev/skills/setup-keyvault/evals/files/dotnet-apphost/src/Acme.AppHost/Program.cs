var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.Acme_Api>("api")
    .WithExternalHttpEndpoints();

builder.Build().Run();
