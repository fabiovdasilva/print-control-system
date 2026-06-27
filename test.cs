using System;
using System.Diagnostics;
class Program { static void Main() { Console.WriteLine(Process.GetCurrentProcess().MainModule.FileName); } }
