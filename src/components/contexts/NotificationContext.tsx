@@ .. @@
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
 
-  const colors = {
-    success: 'bg-green-500/90 border-green-500/20 text-green-100',
-    error: 'bg-red-500/90 border-red-500/20 text-red-100',
-    warning: 'bg-yellow-500/90 border-yellow-500/20 text-yellow-100',
-    info: 'bg-blue-500/90 border-blue-500/20 text-blue-100',
-  };
-
-  const iconColors = {
-    success: 'text-green-200',
-    error: 'text-red-200',
-    warning: 'text-yellow-200',
-    info: 'text-blue-200',
-  };
-
   const Icon = icons[type];
 
   return (
     <div
       className={`
-        ${colors[type]}
-        backdrop-blur-sm border rounded-lg p-4 shadow-lg
+        typewriter-notification ${type === 'success' ? 'typewriter-success' : type === 'error' ? 'typewriter-error' : ''}
+        p-4 shadow-lg
         flex items-start gap-3 min-w-80 max-w-md
-        animate-in slide-in-from-right-full duration-300
         transition-all ease-in-out
       `}
     >
-      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[type]}`} />
-      <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
+      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#1A1A1A]" />
+      <p className="flex-1 text-sm font-medium leading-relaxed text-[#1A1A1A]">{message}</p>
       <button
         onClick={() => onRemove(id)}
-        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
+        className="flex-shrink-0 typewriter-hover"
       >
         <X className="w-4 h-4" />
       </button>