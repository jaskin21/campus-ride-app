import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import BottomNav from "../../components/shared/BottomNav";

interface Student {
  username: string;
  email: string;
  status: string;
  createdAt: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() ?? "";
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/admin/students`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setStudents(data.students ?? []);
      } catch {
        // silent fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <p className="text-white font-semibold text-lg">Students</p>
        <p className="text-zinc-500 text-sm">Registered users</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <p className="text-zinc-500 text-sm">No students found</p>
        </div>
      )}

      <div className="mx-4 space-y-2">
        {students.map((student) => (
          <div
            key={student.username}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {student.email}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Joined {new Date(student.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  student.status === "CONFIRMED"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {student.status === "CONFIRMED" ? "Active" : "Pending"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
