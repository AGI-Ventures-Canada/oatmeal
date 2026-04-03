interface CreateFlowStepProps {
  stepKey: string
  children: React.ReactNode
}

export function CreateFlowStep({ children }: CreateFlowStepProps) {
  return <div className="w-full">{children}</div>
}
