import { describe, it, expect, beforeEach } from "bun:test"
import type { JudgingCriteria, JudgeAssignment } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  setMockRpcImplementation,
} from "../lib/supabase-mock"

const {
  listJudgingCriteria,
  createJudgingCriteria,
  updateJudgingCriteria,
  deleteJudgingCriteria,
  addJudge,
  listJudges,
  removeJudge,
  listJudgeAssignments,
  assignJudgeToSubmission,
  removeJudgeAssignment,
  autoAssignJudges,
  getJudgingProgress,
  getJudgeAssignments,
  getAssignmentDetail,
  submitScores,
  saveNotes,
  getJudgingSetupStatus,
  markAssignmentViewed,
} = await import("@/lib/services/judging")

const mockCriteria: JudgingCriteria = {
  id: "c1",
  hackathon_id: "h1",
  name: "Innovation",
  description: "How innovative is the solution",
  max_score: 10,
  weight: 1.0,
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

const mockAssignment: JudgeAssignment = {
  id: "a1",
  hackathon_id: "h1",
  judge_participant_id: "j1",
  submission_id: "s1",
  is_complete: false,
  notes: "",
  assigned_at: "2026-01-01T00:00:00Z",
  completed_at: null,
  viewed_at: null,
}

describe("Judging Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("listJudgingCriteria", () => {
    it("returns criteria ordered by display_order", async () => {
      const chain = createChainableMock({
        data: [mockCriteria, { ...mockCriteria, id: "c2", name: "Technical", display_order: 1 }],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgingCriteria("h1")

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Innovation")
    })

    it("returns empty array when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgingCriteria("h1")

      expect(result).toEqual([])
    })

    it("returns empty array when no criteria exist", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgingCriteria("h1")

      expect(result).toEqual([])
    })
  })

  describe("createJudgingCriteria", () => {
    it("creates criteria with default values", async () => {
      const chain = createChainableMock({
        data: mockCriteria,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgingCriteria("h1", {
        name: "Innovation",
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Innovation")
    })

    it("creates criteria with custom values", async () => {
      const customCriteria = { ...mockCriteria, max_score: 5, weight: 2.0 }
      const chain = createChainableMock({
        data: customCriteria,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgingCriteria("h1", {
        name: "Innovation",
        description: "Test",
        maxScore: 5,
        weight: 2.0,
        displayOrder: 1,
      })

      expect(result).not.toBeNull()
      expect(result?.max_score).toBe(5)
      expect(result?.weight).toBe(2.0)
    })

    it("returns null when database insert fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgingCriteria("h1", { name: "Test" })

      expect(result).toBeNull()
    })
  })

  describe("updateJudgingCriteria", () => {
    it("updates criteria fields", async () => {
      const updated = { ...mockCriteria, name: "Updated Name" }
      const chain = createChainableMock({
        data: updated,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateJudgingCriteria("c1", "h1", {
        name: "Updated Name",
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Updated Name")
    })

    it("updates multiple fields at once", async () => {
      const updated = { ...mockCriteria, name: "New", max_score: 5 }
      const chain = createChainableMock({
        data: updated,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateJudgingCriteria("c1", "h1", {
        name: "New",
        maxScore: 5,
        weight: 1.5,
      })

      expect(result).not.toBeNull()
    })

    it("returns null when database update fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await updateJudgingCriteria("c1", "h1", { name: "Test" })

      expect(result).toBeNull()
    })
  })

  describe("deleteJudgingCriteria", () => {
    it("returns true on successful deletion", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await deleteJudgingCriteria("c1", "h1")

      expect(result).toBe(true)
    })

    it("returns false when database delete fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await deleteJudgingCriteria("c1", "h1")

      expect(result).toBe(false)
    })
  })

  describe("addJudge", () => {
    it("creates new judge participant when user is not registered", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({
          data: { id: "j1", clerk_user_id: "user_123" },
          error: null,
        })
      })

      const result = await addJudge("h1", "user_123")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.participant.id).toBe("j1")
      }
    })

    it("returns already_judge error when user is already a judge", async () => {
      const chain = createChainableMock({
        data: { id: "j1", role: "judge" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await addJudge("h1", "user_123")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("already_judge")
      }
    })

    it("upgrades existing participant role to judge", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({
            data: { id: "p1", role: "participant" },
            error: null,
          })
        }
        return createChainableMock({
          data: { id: "p1", role: "judge" },
          error: null,
        })
      })

      const result = await addJudge("h1", "user_123")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.participant.id).toBe("p1")
      }
    })

    it("returns update_failed error when role update fails", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({
            data: { id: "p1", role: "participant" },
            error: null,
          })
        }
        return createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      })

      const result = await addJudge("h1", "user_123")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("update_failed")
      }
    })

    it("returns insert_failed error when creating new judge fails", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({
          data: null,
          error: { message: "Insert failed" },
        })
      })

      const result = await addJudge("h1", "user_123")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("insert_failed")
      }
    })
  })

  describe("listJudges", () => {
    it("returns judges with assignment and completion counts", async () => {
      let fetchedJudges = false
      setMockFromImplementation(() => {
        if (!fetchedJudges) {
          fetchedJudges = true
          return createChainableMock({
            data: [{ id: "j1", clerk_user_id: "user_123" }],
            error: null,
          })
        }
        return createChainableMock({
          data: [{ judge_participant_id: "j1", is_complete: true }],
          error: null,
        })
      })

      const result = await listJudges("h1")

      expect(result).toHaveLength(1)
      expect(result[0].participantId).toBe("j1")
      expect(result[0].clerkUserId).toBe("user_123")
      expect(result[0].completedCount).toBe(1)
      expect(result[0].assignmentCount).toBe(1)
    })

    it("returns empty array when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await listJudges("h1")

      expect(result).toEqual([])
    })

    it("returns empty array when no judges exist", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudges("h1")

      expect(result).toEqual([])
    })
  })

  describe("removeJudge", () => {
    it("removes judge participant and all their assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "judge_assignments") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathon_participants") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathon_results") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await removeJudge("h1", "j1")

      expect(result.success).toBe(true)
      expect(result.resultsStale).toBe(false)
    })

    it("marks results as stale if results exist", async () => {
      setMockFromImplementation((table) => {
        if (table === "judge_assignments") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathon_participants") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathon_results") {
          return createChainableMock({ data: [{ id: "r1" }], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await removeJudge("h1", "j1")

      expect(result.success).toBe(true)
      expect(result.resultsStale).toBe(true)
    })

    it("returns error when judge_assignments deletion fails", async () => {
      setMockFromImplementation((table) => {
        if (table === "judge_assignments") {
          return createChainableMock({
            data: null,
            error: { message: "Delete failed" },
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await removeJudge("h1", "j1")

      expect(result.success).toBe(false)
    })

    it("returns error when hackathon_participants deletion fails", async () => {
      setMockFromImplementation((table) => {
        if (table === "judge_assignments") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: null,
            error: { message: "Delete failed" },
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await removeJudge("h1", "j1")

      expect(result.success).toBe(false)
    })
  })

  describe("listJudgeAssignments", () => {
    it("returns assignments with details", async () => {
      const chain = createChainableMock({
        data: [
          {
            ...mockAssignment,
            judge: { clerk_user_id: "user_123" },
            submission: { title: "Project 1" },
          },
        ],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeAssignments("h1")

      expect(result).toHaveLength(1)
      expect(result[0].submissionTitle).toBe("Project 1")
      expect(result[0].id).toBe("a1")
    })

    it("returns empty array when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeAssignments("h1")

      expect(result).toEqual([])
    })
  })

  describe("assignJudgeToSubmission", () => {
    it("creates assignment when judge has no conflict of interest", async () => {
      let step = 0
      setMockFromImplementation(() => {
        step++
        if (step === 1) {
          return createChainableMock({
            data: { id: "j1", team_id: null },
            error: null,
          })
        }
        if (step === 2) {
          return createChainableMock({
            data: { id: "s1", team_id: "t1" },
            error: null,
          })
        }
        return createChainableMock({
          data: mockAssignment,
          error: null,
        })
      })

      const result = await assignJudgeToSubmission("h1", "j1", "s1")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.assignment.id).toBe("a1")
      }
    })

    it("returns judge_not_found error when judge does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await assignJudgeToSubmission("h1", "j1", "s1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("judge_not_found")
      }
    })

    it("returns submission_not_found error when submission does not exist", async () => {
      let fetchedJudge = false
      setMockFromImplementation(() => {
        if (!fetchedJudge) {
          fetchedJudge = true
          return createChainableMock({
            data: { id: "j1", team_id: null },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await assignJudgeToSubmission("h1", "j1", "s1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("submission_not_found")
      }
    })

    it("returns conflict_of_interest error when judge is on the submission team", async () => {
      let fetchedJudge = false
      setMockFromImplementation(() => {
        if (!fetchedJudge) {
          fetchedJudge = true
          return createChainableMock({
            data: { id: "j1", team_id: "t1" },
            error: null,
          })
        }
        return createChainableMock({
          data: { id: "s1", team_id: "t1" },
          error: null,
        })
      })

      const result = await assignJudgeToSubmission("h1", "j1", "s1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("conflict_of_interest")
      }
    })

    it("returns already_assigned error when assignment already exists (duplicate key)", async () => {
      let step = 0
      setMockFromImplementation(() => {
        step++
        if (step === 1) {
          return createChainableMock({
            data: { id: "j1", team_id: null },
            error: null,
          })
        }
        if (step === 2) {
          return createChainableMock({
            data: { id: "s1", team_id: "t1" },
            error: null,
          })
        }
        return createChainableMock({
          data: null,
          error: { message: "Duplicate", code: "23505" },
        })
      })

      const result = await assignJudgeToSubmission("h1", "j1", "s1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("already_assigned")
      }
    })
  })

  describe("removeJudgeAssignment", () => {
    it("returns true on success", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await removeJudgeAssignment("a1")

      expect(result).toBe(true)
    })

    it("returns false when database delete fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await removeJudgeAssignment("a1")

      expect(result).toBe(false)
    })
  })

  describe("autoAssignJudges", () => {
    it("assigns judges to submissions up to specified count per submission", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1", team_id: null }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1", team_id: "t1" }, { id: "s2", team_id: "t2" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await autoAssignJudges("h1", 2)

      expect(result.assignedCount).toBe(2)
    })

    it("returns zero when no judges exist", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await autoAssignJudges("h1", 3)

      expect(result.assignedCount).toBe(0)
    })

    it("returns zero when no submissions exist", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1", team_id: null }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await autoAssignJudges("h1", 3)

      expect(result.assignedCount).toBe(0)
    })

    it("skips conflict of interest assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1", team_id: "t1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1", team_id: "t1" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await autoAssignJudges("h1", 3)

      expect(result.assignedCount).toBe(0)
    })

    it("returns zero when insert fails", async () => {
      let insertCalled = false
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1", team_id: null }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1", team_id: "t1" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          if (!insertCalled) {
            insertCalled = true
            return createChainableMock({ data: [], error: null })
          }
          return createChainableMock({
            data: null,
            error: { message: "Insert failed" },
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await autoAssignJudges("h1", 3)

      expect(result.assignedCount).toBe(0)
    })
  })

  describe("getJudgingProgress", () => {
    it("returns progress with completed assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [
              { judge_participant_id: "j1", is_complete: true },
              { judge_participant_id: "j1", is_complete: false },
              { judge_participant_id: "j2", is_complete: true },
            ],
            error: null,
          })
        }
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [
              { id: "j1", clerk_user_id: "user_1" },
              { id: "j2", clerk_user_id: "user_2" },
            ],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingProgress("h1")

      expect(result.totalAssignments).toBe(3)
      expect(result.completedAssignments).toBe(2)
      expect(result.judges).toHaveLength(2)
    })

    it("handles no assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "hackathon_participants") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingProgress("h1")

      expect(result.totalAssignments).toBe(0)
      expect(result.completedAssignments).toBe(0)
      expect(result.judges).toEqual([])
    })
  })

  describe("getJudgeAssignments", () => {
    it("returns all assignments for a specific judge with submission details", async () => {
      let foundParticipant = false
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants" && !foundParticipant) {
          foundParticipant = true
          return createChainableMock({
            data: { id: "j1" },
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [
              {
                id: "a1",
                submission_id: "s1",
                is_complete: false,
                notes: "",
                submission: {
                  title: "Project",
                  description: "Desc",
                  github_url: "https://github.com/test",
                  live_app_url: null,
                  screenshot_url: null,
                  team_id: "t1",
                },
              },
            ],
            error: null,
          })
        }
        if (table === "teams") {
          return createChainableMock({
            data: [{ id: "t1", name: "Team One" }],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgeAssignments("h1", "user_123")

      expect(result).toHaveLength(1)
      expect(result[0].submissionTitle).toBe("Project")
      expect(result[0].teamName).toBe("Team One")
    })

    it("returns empty array when user is not a judge for this hackathon", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getJudgeAssignments("h1", "user_not_judge")

      expect(result).toEqual([])
    })

    it("returns empty array when database query fails", async () => {
      let foundParticipant = false
      setMockFromImplementation(() => {
        if (!foundParticipant) {
          foundParticipant = true
          return createChainableMock({ data: { id: "j1" }, error: null })
        }
        return createChainableMock({
          data: null,
          error: { message: "DB error" },
        })
      })

      const result = await getJudgeAssignments("h1", "user_123")

      expect(result).toEqual([])
    })
  })

  describe("getAssignmentDetail", () => {
    it("returns assignment with submission details, criteria, and existing scores", async () => {
      let fetchedAssignment = false
      setMockFromImplementation((table) => {
        if (table === "judge_assignments" && !fetchedAssignment) {
          fetchedAssignment = true
          return createChainableMock({
            data: {
              id: "a1",
              hackathon_id: "h1",
              submission_id: "s1",
              is_complete: false,
              notes: "",
              judge: { clerk_user_id: "user_123" },
              submission: {
                title: "Project",
                description: "Desc",
                github_url: "https://github.com/test",
                live_app_url: null,
                screenshot_url: null,
                team_id: "t1",
              },
            },
            error: null,
          })
        }
        if (table === "judging_criteria") {
          return createChainableMock({
            data: [mockCriteria],
            error: null,
          })
        }
        if (table === "scores") {
          return createChainableMock({
            data: [{ criteria_id: "c1", score: 8 }],
            error: null,
          })
        }
        if (table === "teams") {
          return createChainableMock({
            data: { name: "Team One" },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getAssignmentDetail("a1", "user_123")

      expect(result).not.toBeNull()
      expect(result?.submissionTitle).toBe("Project")
      expect(result?.teamName).toBe("Team One")
      expect(result?.criteria).toHaveLength(1)
      expect(result?.criteria[0].currentScore).toBe(8)
    })

    it("returns null when assignment does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getAssignmentDetail("a1", "user_123")

      expect(result).toBeNull()
    })

    it("returns null when requesting user is not the assigned judge", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          hackathon_id: "h1",
          judge: { clerk_user_id: "other_user" },
          submission: { title: "Project", description: null, github_url: null, live_app_url: null, screenshot_url: null, team_id: null },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getAssignmentDetail("a1", "user_123")

      expect(result).toBeNull()
    })
  })

  describe("submitScores", () => {
    it("submits scores and marks assignment as complete", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          judge: { clerk_user_id: "user_123" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)
      setMockRpcImplementation(() =>
        Promise.resolve({
          data: [{ success: true }],
          error: null,
        })
      )

      const result = await submitScores("a1", "user_123", {
        scores: [{ criteriaId: "c1", score: 8 }],
        notes: "Good work",
      })

      expect(result.success).toBe(true)
    })

    it("returns assignment_not_found error when assignment does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await submitScores("a1", "user_123", {
        scores: [{ criteriaId: "c1", score: 8 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("assignment_not_found")
      }
    })

    it("returns not_authorized error when user is not the assigned judge", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          judge: { clerk_user_id: "other_user" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await submitScores("a1", "user_123", {
        scores: [{ criteriaId: "c1", score: 8 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("not_authorized")
      }
    })

    it("returns rpc_failed error when database RPC call fails", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          judge: { clerk_user_id: "user_123" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)
      setMockRpcImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: "RPC failed" },
        })
      )

      const result = await submitScores("a1", "user_123", {
        scores: [{ criteriaId: "c1", score: 8 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("rpc_failed")
      }
    })

    it("returns error code from RPC when score validation fails", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          judge: { clerk_user_id: "user_123" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)
      setMockRpcImplementation(() =>
        Promise.resolve({
          data: [{ success: false, error_message: "Invalid score", error_code: "invalid_score" }],
          error: null,
        })
      )

      const result = await submitScores("a1", "user_123", {
        scores: [{ criteriaId: "c1", score: 8 }],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("invalid_score")
        expect(result.error).toBe("Invalid score")
      }
    })
  })

  describe("saveNotes", () => {
    it("saves notes to assignment successfully", async () => {
      let fetchedAssignment = false
      setMockFromImplementation(() => {
        if (!fetchedAssignment) {
          fetchedAssignment = true
          return createChainableMock({
            data: {
              id: "a1",
              judge: { clerk_user_id: "user_123" },
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await saveNotes("a1", "user_123", "Updated notes")

      expect(result).toBe(true)
    })

    it("returns false when assignment does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await saveNotes("a1", "user_123", "Notes")

      expect(result).toBe(false)
    })

    it("returns false when user is not the assigned judge", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          judge: { clerk_user_id: "other_user" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await saveNotes("a1", "user_123", "Notes")

      expect(result).toBe(false)
    })

    it("returns false when database update fails", async () => {
      let fetchedAssignment = false
      setMockFromImplementation(() => {
        if (!fetchedAssignment) {
          fetchedAssignment = true
          return createChainableMock({
            data: {
              id: "a1",
              judge: { clerk_user_id: "user_123" },
            },
            error: null,
          })
        }
        return createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      })

      const result = await saveNotes("a1", "user_123", "Notes")

      expect(result).toBe(false)
    })
  })

  describe("markAssignmentViewed", () => {
    it("marks assignment as viewed when not already viewed", async () => {
      let fetchedAssignment = false
      setMockFromImplementation(() => {
        if (!fetchedAssignment) {
          fetchedAssignment = true
          return createChainableMock({
            data: {
              id: "a1",
              viewed_at: null,
              judge: { clerk_user_id: "user_123" },
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await markAssignmentViewed("a1", "user_123")
      expect(result).toBe(true)
    })

    it("returns true without updating when already viewed", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          viewed_at: "2026-01-01T00:00:00Z",
          judge: { clerk_user_id: "user_123" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await markAssignmentViewed("a1", "user_123")
      expect(result).toBe(true)
    })

    it("returns false when assignment does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await markAssignmentViewed("a1", "user_123")
      expect(result).toBe(false)
    })

    it("returns false when user is not the assigned judge", async () => {
      const chain = createChainableMock({
        data: {
          id: "a1",
          viewed_at: null,
          judge: { clerk_user_id: "other_user" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await markAssignmentViewed("a1", "user_123")
      expect(result).toBe(false)
    })

    it("returns false when database update fails", async () => {
      let fetchedAssignment = false
      setMockFromImplementation(() => {
        if (!fetchedAssignment) {
          fetchedAssignment = true
          return createChainableMock({
            data: {
              id: "a1",
              viewed_at: null,
              judge: { clerk_user_id: "user_123" },
            },
            error: null,
          })
        }
        return createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      })

      const result = await markAssignmentViewed("a1", "user_123")
      expect(result).toBe(false)
    })
  })

  describe("getJudgingSetupStatus", () => {
    it("returns zero judges and no unassigned submissions when no data", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "submissions") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(0)
      expect(result.hasUnassignedSubmissions).toBe(false)
    })

    it("returns correct judge count", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }, { id: "j2" }, { id: "j3" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(3)
    })

    it("returns hasUnassignedSubmissions true when submissions have no assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }, { id: "s2" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.hasUnassignedSubmissions).toBe(true)
    })

    it("returns hasUnassignedSubmissions false when all submissions are assigned", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }, { id: "s2" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [{ submission_id: "s1" }, { submission_id: "s2" }],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.hasUnassignedSubmissions).toBe(false)
    })

    it("returns hasUnassignedSubmissions true when some submissions are not assigned", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [{ submission_id: "s1" }],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.hasUnassignedSubmissions).toBe(true)
    })

    it("treats null query results as empty arrays", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "submissions") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(0)
      expect(result.hasUnassignedSubmissions).toBe(false)
    })

    it("handles multiple assignments for same submission", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }, { id: "j2" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [
              { submission_id: "s1" },
              { submission_id: "s1" },
            ],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(2)
      expect(result.hasUnassignedSubmissions).toBe(false)
    })
  })
})
