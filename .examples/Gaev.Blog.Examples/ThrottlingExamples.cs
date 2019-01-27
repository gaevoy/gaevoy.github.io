using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public class Uploader
{
    private readonly DriveService _googleApi;

    public async Task UploadFolder(string path)
    {
        await Task.WhenAll(new DirectoryInfo(path)
            .EnumerateFiles()
            .Select(file => UploadFile(file.FullName))
        );
    }

    public async Task UploadFile(string path)
    {
        using (var content = File.OpenRead(path))
            await _googleApi.UploadFile(path, content);
    }

    private async Task Throttle()
    {
    }
}

public class ThrottledSomething
{
    private readonly SemaphoreSlim _throttler = new SemaphoreSlim( /*degreeOfParallelism:*/ 2);

    public async Task Throttle()
    {
        await _throttler.WaitAsync();
        try
        {
            // calling a method to throttle
        }
        finally
        {
            _throttler.Release();
        }
    }
}

public class ThrottledUploader
{
    private readonly DriveService _googleApi;
    private readonly SemaphoreSlim _throttler = new SemaphoreSlim( /*degreeOfParallelism:*/ 2);

    public async Task UploadFolder(string path)
    {
        await Task.WhenAll(new DirectoryInfo(path)
            .EnumerateFiles()
            .Select(file => UploadFile(file.FullName))
        );
    }

    public async Task UploadFile(string path)
    {
        await _throttler.WaitAsync();
        try
        {
            using (var content = File.OpenRead(path))
                await _googleApi.UploadFile(path, content);
        }
        finally
        {
            _throttler.Release();
        }
    }
}

public class ThrottledUploader2
{
    private readonly DriveService _googleApi;
    private readonly SemaphoreSlim _throttler = new SemaphoreSlim( /*degreeOfParallelism:*/ 2);

    public async Task UploadFolder(string path)
    {
        await Task.WhenAll(new DirectoryInfo(path)
            .EnumerateFiles()
            .Select(file => UploadFile(file.FullName))
        );
    }

    public async Task UploadFile(string path)
    {
        using (_throttler.Throttle())
        using (var content = File.OpenRead(path))
            await _googleApi.UploadFile(path, content);
    }
}

public static class ThrottlerExt
{
    public static async Task<IDisposable> Throttle(this SemaphoreSlim throttler)
    {
        await throttler.WaitAsync();
        return new Throttler(throttler);
    }

    private class Throttler : IDisposable
    {
        private readonly SemaphoreSlim _throttler;

        public Throttler(SemaphoreSlim throttler) => _throttler = throttler;

        public void Dispose() => _throttler.Release();
    }
}

public interface DriveService
{
    Task UploadFile(string name, Stream content);
}