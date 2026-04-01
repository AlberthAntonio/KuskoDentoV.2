import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PaymentForm = {
  amount: string;
  method: string;
  notes: string;
};

type SelectedAppointment = {
  date: string;
  doctorName: string;
  cost: number;
};

type PaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppointment?: SelectedAppointment;
  paymentForm: PaymentForm;
  onFormChange: (form: PaymentForm) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
};

export function PaymentModal({
  open,
  onOpenChange,
  selectedAppointment,
  paymentForm,
  onFormChange,
  onSubmit,
  isSubmitting,
}: PaymentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago de Cita</DialogTitle>
          <DialogDescription>
            Fecha: {selectedAppointment?.date || '---'} | Dr. {selectedAppointment?.doctorName || '---'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="cost">Costo de la Cita</Label>
            <Input
              id="cost"
              type="number"
              value={selectedAppointment?.cost?.toFixed(2) || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="amount">Monto a Pagar</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => onFormChange({ ...paymentForm, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="method">Metodo de Pago</Label>
            <Select
              value={paymentForm.method}
              onValueChange={(value) => onFormChange({ ...paymentForm, method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="bank_transfer">Transferencia</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={paymentForm.notes}
              onChange={(e) => onFormChange({ ...paymentForm, notes: e.target.value })}
              placeholder="Observaciones sobre el pago"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Registrar Pago'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
