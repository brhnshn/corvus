using System.Runtime.InteropServices;

namespace Corvus.Api.Utils;

public static class NativeMemoryTrimmer
{
    [DllImport("libc", EntryPoint = "malloc_trim", SetLastError = false)]
    private static extern int MallocTrim(nuint pad);

    public static void Trim()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            try
            {
                MallocTrim(0);
            }
            catch
            {
                // non-glibc veya erişim kısıtlı ortamlarda yut
            }
        }
    }
}
