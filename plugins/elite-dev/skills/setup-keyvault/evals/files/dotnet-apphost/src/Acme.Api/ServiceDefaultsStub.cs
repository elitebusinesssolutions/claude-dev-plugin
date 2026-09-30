// Stands in for the Aspire ServiceDefaults project that a real solution references.
public static class ServiceDefaultsStub
{
    public static WebApplicationBuilder AddServiceDefaults(this WebApplicationBuilder builder) => builder;

    public static WebApplication MapDefaultEndpoints(this WebApplication app) => app;
}
