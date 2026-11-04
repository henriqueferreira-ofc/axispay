import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      offset={{ top: "calc(env(safe-area-inset-top, 0px) + 24px)", bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 24px)", bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", left: 16, right: 16 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
