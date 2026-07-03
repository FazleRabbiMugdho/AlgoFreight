namespace AlgoFreight.Domain.Enums;

public static class PriorityExtensions
{
    public static int GetWeight(this Priority priority) => priority switch
    {
        Priority.Low => 1,
        Priority.Medium => 2,
        Priority.High => 3,
        Priority.Urgent => 4,
        _ => throw new ArgumentOutOfRangeException(nameof(priority), priority, null)
    };
}
