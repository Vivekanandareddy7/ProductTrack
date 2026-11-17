import React from 'react'

interface ContainerProps {
    children: React.ReactNode
    className?: string
    fullWidth?: boolean
}

const Container = ({ children, className, fullWidth }: ContainerProps) => {
    return (
        <div
            className={`${fullWidth ? "" : "max-w-5xl m-auto mt-10"} ${className ?? ""}`}
        >
            {children}
        </div>
    )
}

export default Container
