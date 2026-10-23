using Corvus.Api.Models;
using Corvus.Api.Services.Auth;

namespace Corvus.Api.Services;

// Rol çözümleme, parola değiştirme ve kullanıcı yönetimi (RBAC)
public partial class AuthService
{
    public async Task<string> GetUserRoleAsync(string username)
    {
        if (!_authEnabled || string.Equals(username, "anonymous", StringComparison.OrdinalIgnoreCase))
        {
            return "admin";
        }

        var now = DateTime.UtcNow;
        if (RoleCache.TryGetValue(username, out var cached) && (now - cached.CachedAt).TotalSeconds < 30)
        {
            return cached.Role;
        }

        var user = await _userRepo.GetByUsernameAsync(username);
        string role;
        if (user != null)
        {
            role = string.IsNullOrWhiteSpace(user.Role) ? "viewer" : user.Role;
        }
        else
        {
            int userCount = await _userRepo.GetCountAsync();
            if (userCount == 0 && string.Equals(username, _defaultUser, StringComparison.OrdinalIgnoreCase))
            {
                role = "admin";
            }
            else
            {
                role = "viewer";
            }
        }
        RoleCache[username] = new RoleCacheItem(role, now);
        return role;
    }

    public async Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(string username, string currentPassword, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, "Kullanıcı bilgisi geçersiz.");
        }

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < PasswordHasher.MinPasswordLength)
        {
            return (false, $"Yeni şifre en az {PasswordHasher.MinPasswordLength} karakter olmalıdır.");
        }

        var user = await _userRepo.GetByUsernameAsync(username);
        if (user != null)
        {
            if (!PasswordHasher.Verify(currentPassword, user.PasswordHash, out _))
            {
                return (false, "Mevcut şifre hatalı.");
            }

            string newHash = PasswordHasher.Hash(newPassword);
            bool updated = await _userRepo.UpdatePasswordAsync(username, newHash);
            return updated ? (true, null) : (false, "Şifre güncellenemedi.");
        }

        // Fallback default admin kontrolü (eğer henüz users tablosunda kullanıcı yoksa)
        if (string.Equals(username, _defaultUser, StringComparison.OrdinalIgnoreCase))
        {
            if (!VerifyDefaultPassword(currentPassword))
            {
                return (false, "Mevcut şifre hatalı.");
            }

            var newUser = new User
            {
                Id = Guid.NewGuid().ToString("N"),
                Username = _defaultUser,
                PasswordHash = PasswordHasher.Hash(newPassword),
                Role = "admin",
                CreatedAt = DateTime.UtcNow.ToString("o")
            };
            await _userRepo.CreateAsync(newUser);
            return (true, null);
        }

        return (false, "Kullanıcı bulunamadı.");
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepo.GetAllAsync();
        if (users.Count == 0 && !string.IsNullOrEmpty(_defaultUser))
        {
            return new List<UserDto>
            {
                new("default", _defaultUser, "admin", DateTime.UtcNow.ToString("o"))
            };
        }

        var result = new List<UserDto>(users.Count);
        foreach (var u in users)
        {
            result.Add(new UserDto(u.Id, u.Username, u.Role, u.CreatedAt));
        }
        return result;
    }

    public async Task<(bool Success, string? ErrorMessage)> CreateUserAsync(string username, string password, string role)
    {
        string cleanUser = username?.Trim() ?? string.Empty;
        if (cleanUser.Length < 3)
        {
            return (false, "Kullanıcı adı en az 3 karakter olmalıdır.");
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < PasswordHasher.MinPasswordLength)
        {
            return (false, $"Şifre en az {PasswordHasher.MinPasswordLength} karakter olmalıdır.");
        }

        string cleanRole = role?.Trim().ToLowerInvariant() switch
        {
            "admin" => "admin",
            "operator" => "operator",
            "viewer" => "viewer",
            _ => "viewer"
        };

        var existing = await _userRepo.GetByUsernameAsync(cleanUser);
        if (existing != null || (await _userRepo.GetCountAsync() == 0 && string.Equals(cleanUser, _defaultUser, StringComparison.OrdinalIgnoreCase)))
        {
            return (false, "Bu kullanıcı adı zaten kayıtlı.");
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Username = cleanUser,
            PasswordHash = PasswordHasher.Hash(password),
            Role = cleanRole,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _userRepo.CreateAsync(user);
        return (true, null);
    }

    public async Task<(bool Success, string? ErrorMessage)> UpdateUserRoleAsync(string id, string newRole, string currentUsername)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null)
        {
            return (false, "Kullanıcı bulunamadı.");
        }

        string cleanRole = newRole?.Trim().ToLowerInvariant() switch
        {
            "admin" => "admin",
            "operator" => "operator",
            "viewer" => "viewer",
            _ => "viewer"
        };

        if (string.Equals(user.Username, currentUsername, StringComparison.OrdinalIgnoreCase) && cleanRole != "admin")
        {
            return (false, "Kendi yönetici rolünüzü değiştiremezsiniz.");
        }

        if (string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase) && cleanRole != "admin")
        {
            var allUsers = await _userRepo.GetAllAsync();
            int adminCount = allUsers.Count(u => string.Equals(u.Role, "admin", StringComparison.OrdinalIgnoreCase));
            if (adminCount <= 1)
            {
                return (false, "Sistemdeki son yönetici rolü değiştirilemez.");
            }
        }

        bool updated = await _userRepo.UpdateRoleAsync(id, cleanRole);
        if (!updated)
        {
            return (false, "Rol güncellenemedi.");
        }

        RoleCache.TryRemove(user.Username, out _);

        return (true, null);
    }

    public async Task<(bool Success, string? ErrorMessage)> DeleteUserAsync(string id, string currentUsername)
    {
        var user = await _userRepo.GetByIdAsync(id);
        if (user == null)
        {
            return (false, "Kullanıcı bulunamadı.");
        }

        if (string.Equals(user.Username, currentUsername, StringComparison.OrdinalIgnoreCase))
        {
            return (false, "Kendi hesabınızı silemezsiniz.");
        }

        if (string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            var allUsers = await _userRepo.GetAllAsync();
            int adminCount = allUsers.Count(u => string.Equals(u.Role, "admin", StringComparison.OrdinalIgnoreCase));
            if (adminCount <= 1)
            {
                return (false, "Sistemdeki son yönetici hesabı silinemez.");
            }
        }

        bool deleted = await _userRepo.DeleteAsync(id);
        if (!deleted)
        {
            return (false, "Kullanıcı silinemedi.");
        }

        // Kullanıcının aktif oturumlarını temizle
        if (_sessionRepo != null)
        {
            await _sessionRepo.DeleteSessionsByUsernameAsync(user.Username);
        }

        foreach (var pair in ActiveSessions)
        {
            if (string.Equals(pair.Value.Username, user.Username, StringComparison.OrdinalIgnoreCase))
            {
                ActiveSessions.TryRemove(pair.Key, out _);
            }
        }

        RoleCache.TryRemove(user.Username, out _);

        return (true, null);
    }
}
