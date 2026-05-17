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
  const [students, setStudents] = useState<Student[]>( [] );
  const [isLoading, setIsLoading] = useState( true );

  useEffect( () => {
    const fetchStudents = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() ?? "";
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/admin/students`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if ( !res.ok ) return;
        const data = await res.json();
        setStudents( data.students ?? [] );
      } catch {
        // silent fail
      } finally {
        setIsLoading( false );
      }
    };
    fetchStudents();
  }, [] );

  return (
    <div
      className="bg-zinc-950 w-full overflow-y-auto"
      style={{ minHeight: "100dvh" }}
    >
      {/* Scrollable content */}
      <div
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {/* Header */}
        <div className="pb-4">
          <p className="text-white font-semibold text-lg">Students</p>
          <p className="text-zinc-500 text-sm">Registered users</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && students.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-zinc-500 text-sm">No students found</p>
          </div>
        )}

        {/* Student list */}
        <div className="space-y-2">
          {students.map( ( student ) => (
            <div
              key={student.username}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                    👤
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {student.email}
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Joined {new Date( student.createdAt ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${student.status === "CONFIRMED"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                    }`}
                >
                  {student.status === "CONFIRMED" ? "Active" : "Pending"}
                </span>
              </div>
            </div>
          ) )}
        </div>
      </div>

      {/* BottomNav fixed to bottom — not in document flow */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <BottomNav />
      </div>
    </div>
  );
}