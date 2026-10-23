using System.Text.Json;
using System.Text.Json.Serialization;

namespace Corvus.Api.Models;

public class DockerImageInspectInfo
{
    [JsonPropertyName("Id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("RepoTags")]
    public List<string>? RepoTags { get; set; }

    [JsonPropertyName("RepoDigests")]
    public List<string>? RepoDigests { get; set; }

    [JsonPropertyName("Created")]
    public string? Created { get; set; }

    [JsonPropertyName("Size")]
    public long Size { get; set; }
}

public class ContainerImageUpdateInfo
{
    [JsonPropertyName("containerId")]
    public string ContainerId { get; set; } = string.Empty;

    [JsonPropertyName("image")]
    public string Image { get; set; } = string.Empty;

    [JsonPropertyName("hasUpdate")]
    public bool HasUpdate { get; set; }

    [JsonPropertyName("localDigest")]
    public string? LocalDigest { get; set; }

    [JsonPropertyName("remoteDigest")]
    public string? RemoteDigest { get; set; }

    [JsonPropertyName("registry")]
    public string Registry { get; set; } = string.Empty;

    [JsonPropertyName("checkedAt")]
    public DateTime CheckedAt { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class ContainerImageRecreateRequest
{
    [JsonPropertyName("pullLatest")]
    public bool PullLatest { get; set; } = true;
}

public class ComposeFileDto
{
    [JsonPropertyName("projectName")]
    public string ProjectName { get; set; } = string.Empty;

    [JsonPropertyName("filePath")]
    public string FilePath { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("envContent")]
    public string? EnvContent { get; set; }

    [JsonPropertyName("envFilePath")]
    public string? EnvFilePath { get; set; }

    [JsonPropertyName("envExists")]
    public bool EnvExists { get; set; }

    [JsonPropertyName("lastModified")]
    public DateTime? LastModified { get; set; }

    [JsonPropertyName("exists")]
    public bool Exists { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class SaveComposeFileRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("envContent")]
    public string? EnvContent { get; set; }

    [JsonPropertyName("restartStack")]
    public bool RestartStack { get; set; } = false;
}

public class ComposeDeployResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("output")]
    public string Output { get; set; } = string.Empty;

    [JsonPropertyName("exitCode")]
    public int ExitCode { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class DeployWebhookRequest
{
    [JsonPropertyName("containerId")]
    public string? ContainerId { get; set; }

    [JsonPropertyName("projectName")]
    public string? ProjectName { get; set; }

    [JsonPropertyName("pullLatest")]
    public bool PullLatest { get; set; } = true;
}

public class DeployWebhookResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("restartedContainers")]
    public List<string> RestartedContainers { get; set; } = [];
}
