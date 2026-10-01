using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Corvus.Api.Utils;

public static class NativeMemoryTrimmer
{
    [DllImport("libc", EntryPoint = "malloc_trim", SetLastError = false)]
    private static extern int MallocTrim(nuint pad);

    [DllImport("psapi.dll", SetLastError = true)]
    private static extern bool EmptyWorkingSet(IntPtr hProcess);

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
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                using var proc = Process.GetCurrentProcess();
                EmptyWorkingSet(proc.Handle);
            }
            catch
            {
                // İzin kısıtlı ortamlarda yut
            }
        }
    }
}
