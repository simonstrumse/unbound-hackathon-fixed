const NotificationToast: React.FC<{
   notification: Notification;
   onRemove: (id: string) => void;
 }> = ({ notification, onRemove }) => {
   const { id, type, message } = notification;
 
   const icons = {
     success: CheckCircle,
     error: XCircle,
     warning: AlertCircle,
     info: Info,
   };
 
   const Icon = icons[type];

   return (
     <div
       className={`
        typewriter-notification ${type === 'success' ? 'typewriter-success' : type === 'error' ? 'typewriter-error' : ''}
        p-4 shadow-lg
        flex items-start gap-3 min-w-80 max-w-md
        transition-all ease-in-out
      `}
     >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#1A1A1A]" />
      <p className="flex-1 text-sm font-medium leading-relaxed text-[#1A1A1A]">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 typewriter-hover"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
   );
};